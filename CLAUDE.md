# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

YTMD is a desktop client for YouTube Music built on **Tauri v2** (Rust backend) + **TypeScript** (frontend, no framework). It works by opening `https://music.youtube.com` in a Tauri webview and injecting a bundled script (`src-tauri/inject/preload.js`) that manipulates the page's DOM directly — there is no React/Vue/etc., and no server-side rendering of YouTube Music itself. Companion windows (settings, mini player, local library, room sync) are separate first-party HTML pages built by Vite.

## Commands

```bash
bun install                # install deps (Bun is the primary package manager/runtime)

bun run tauri dev          # dev mode: builds preload.js then launches the Tauri app
bun run tauri build        # production build -> src-tauri/target/release/bundle/ (.deb/.rpm/.AppImage)

bun run build:preload      # bundle src/preload/index.ts -> src-tauri/inject/preload.js (must rerun after preload edits before `cargo build`/`cargo test` for it to affect a real run)
bun run build              # tsc + vite build (companion windows) + build:preload
bun run typecheck          # tsc --noEmit, no build output

bun test                   # all frontend tests (src/tests/*.test.ts, bun:test runner)
bun test src/tests/dsp.test.ts   # single file
bun test -t "test name"          # single test by name

cd src-tauri
cargo test                 # all Rust tests (inline #[cfg(test)] mod tests in each source file)
cargo test sync_room::      # tests in one module
cargo test test_name        # single test by name substring
cargo clippy                # lint — keep this clean, it's enforced as part of doing the job right
cargo check                 # fast compile check without lint
```

There is no frontend linter/formatter configured (no ESLint/Prettier) — `tsc --noEmit` with `strict`, `noUnusedLocals`, `noUnusedParameters` is the only frontend gate. Keep code free of `any` — the codebase has none; `window.__TAURI__` is fully typed in `src/types/global.d.ts`, use that instead of re-casting `window as any`.

Linux system deps needed to build (`webkit2gtk-4.1`, `libappindicator-gtk3`, `librsvg2`, `libasound2-dev`) are listed per-distro in README.md.

## Architecture

### Two frontends, two build outputs
- **The injected script** (`src/preload/index.ts` and everything it imports — `src/plugins/*`, `src/preload/bridge.ts`, `src/preload/observer.ts`) is bundled by `bun build` (via `build:preload`) into a single file, `src-tauri/inject/preload.js`. That file is embedded into the Rust binary at compile time with `include_str!("../inject/preload.js")` in `src-tauri/src/lib.rs` and handed to Tauri as `initialization_script(...)` for the main window, which loads the *external* URL `https://music.youtube.com`. **If you edit anything under `src/preload/` or `src/plugins/`, you must run `bun run build:preload` before the Rust app will reflect the change** — `cargo build`/`cargo tauri dev` do not do this for you automatically outside of the `bun run tauri dev` script.
- **Companion windows** (`index.html`, `settings.html`, `local.html`, `miniplayer.html`, `sync.html` + their `src/ui/*.ts` scripts) are ordinary Vite multi-entry pages (see `vite.config.ts`), served as local Tauri windows, not injected into an external page.

### Plugin system (`src/plugins/`)
Each plugin is a **singleton object literal** implementing `YTMDPlugin` (`src/plugins/types.ts`): `id`, lifecycle hooks `onInit`/`onTrackChange`/`onPlaybackChange`/`onTick`/`onDestroy`, each receiving a shared `PluginContext` (current track, config, `invoke`, `sendPlayerCommand`, `getVideoElement`). `PluginRegistry` (`src/plugins/registry.ts`) registers all plugins once in `src/preload/index.ts`, and calls each hook by name (`plugin.onInit(ctx)`), catching and logging per-plugin errors so one broken plugin doesn't take down the others.

Because each plugin module is registered exactly once, per-plugin private state (cleanup callbacks, cached controllers, etc.) lives in **module-level `let` variables**, not on `this` — e.g. `src/plugins/volume/index.ts` declares `let cleanup: (() => void) | null = null;` at module scope and sets/reads it from the lifecycle hooks. Follow this pattern for new plugins; do not stash state on `this`.

Plugins interact with the live YouTube Music page purely through DOM queries/mutation and the `video` element (`ctx.getVideoElement()`), since there is no access to YouTube Music's internal JS state. `PlayerObserver` (`src/preload/observer.ts`) is the single source of truth for track/playback-change/tick events, driven by `MutationObserver` + polling; `PlayerBridge` (`src/preload/bridge.ts`) is the write side (play/pause/seek/volume/etc. via native player-bar button clicks or the `video` element directly).

### Two separate IPC paths — this is the part most likely to surprise you
1. **Companion windows → Rust**: standard Tauri IPC, `window.__TAURI__.core.invoke('command_name', args)` / `.event.listen(...)`, handled by `#[tauri::command]` functions in `src-tauri/src/commands.rs`, registered in the top-level `.invoke_handler(tauri::generate_handler![...])` in `src-tauri/src/lib.rs`. Permissions for this are declared in `src-tauri/capabilities/default.json`.
2. **Injected script (music.youtube.com) → Rust**: because the main window loads an *external* origin, it goes through a **custom event-based bridge** instead of direct command invocation: `invokeBackend()` in `src/preload/bridgeClient.ts` emits a `ytmd-invoke` Tauri event with `{ id, cmd, args }`; `src-tauri/src/bridge.rs` dispatches it and replies on a per-request `ytmd-response-{id}` event with `{ "ok": true, "data": ... }` or `{ "ok": false, "error": "..." }` (unknown command, bad args, or a command's `Err`). `invokeBackend` resolves `data` or rejects with the error, and rejects after 8s without a reply. Commands callable from the injected page are declared once in the `bridge_commands!` table in `bridge.rs`, which generates both `BRIDGE_COMMANDS` and the dispatch, so a command can't be listed without being handled. `src/tests/sync.test.ts` fails if any `invoke('x')`/`invokeBackend('x')`/`runAction('x')` under `src/preload`/`src/plugins` isn't in that table (a missing entry once silently killed Listen Together and the sleep inhibitor). Long work doesn't block a reply: `download_track` answers as soon as the download starts and reports progress/completion/failure through `download-progress` events (`error` is non-null on failure).

`get_current_track` (reads `AppState.current_track`, written by `update_track_info`) lets a companion window opened mid-song fetch what's already playing instead of waiting for the next periodic `track-changed` broadcast (which only fires on track/playback change or every ~15s while playing).

### Undecorated windows need an explicit drag permission
All four companion windows (`miniplayer`, `settings`, `local`, `sync`) are created with `decorations: false` in `tauri.conf.json`, so `data-tauri-drag-region` in their HTML is the *only* way to move them. That attribute is inert unless `core:window:allow-start-dragging` is listed in `src-tauri/capabilities/default.json` — it is not part of `core:window:default`. If window dragging silently stops working after a capabilities edit, check that permission first.

### Rust backend module map (`src-tauri/src/`)
One file per concern, each owning its own state and (mostly) its own inline tests: `config.rs` (persistent `~/.ytmd/config.json`, with legacy-path migration from `~/.config/ytmd/config.json`), `mpris.rs` (Linux D-Bus media keys), `discord_rpc.rs` (native Discord IPC socket), `tray.rs`, `shortcuts.rs` (global shortcuts), `local_files.rs` (local library scan), `downloader.rs`, `remote_server.rs` (mobile web-remote HTTP/WS server with token auth), `power_manager.rs` (sleep inhibition), `screen_lock.rs` (Linux: pauses on the desktop's real lock signal via D-Bus when `pause_on_lock` is on; never infer a lock from `document.hidden`, which is also true when minimized), and the room-sync pair `sync_room.rs` (room/member state, `WireMessage` protocol, LAN UDP-beacon + TCP transport) + `p2p_sync.rs` (libp2p/DHT internet transport, added as an alternate transport for the *same* `WireMessage` protocol — see `plan.md` for the full design rationale if extending this). All backend state is centralized in `AppState` (`lib.rs`), constructed once and shared via `Arc<AppState>` / `tauri::State`.

### Config
User config is a single JSON file at `~/.ytmd/config.json` (not XDG `~/.config/`), managed by `ConfigManager` in `config.rs`; the frontend reads/writes it through the `get_config`/`save_config` commands via whichever IPC path applies to that window.

## Visual design: looks like YouTube Music made it

Everything YTMD adds, inside the YTM page and in its own windows, uses YouTube Music's visual language (Roboto, YTM's near-black canvas and #212121 surfaces, white/70%-white text, 40px round icon buttons, 36px pill buttons, 8px-radius chips and inputs, YTM's toggles, sliders, list rows and bottom player bar), speaks the user's language (Polish/English), and sits over a subdued per-track album-art wash whose extracted color is the accent.

### Companion windows
`settings.html`, `sync.html`, `local.html`, `miniplayer.html` share `src/ui/styles.css` (component classes: `.titlebar`, `.icon-btn`, `.btn`/`.btn-filled`/`.btn-tonal`, `.chip`, `.input`/`.select`, `.toggle`, `.range`, `.setting-row`, `.tracks-table`, `.player-bar`, ...; use them, don't add inline styles). Every visible string comes from `src/ui/i18n.ts` (`data-i18n`/`data-i18n-label`/`data-i18n-placeholder` in markup, `tr()` in code); `src/tests/companion_i18n.test.ts` fails on untagged visible text or a key missing from a locale. `initWindowChrome()` (`src/ui/window.ts`) wires translations, window buttons, slider fill (`.range` needs `syncRange()` after setting `.value` from code) and the kit's tooltips. Toasts, tooltips and dialogs are the same kit the injected page uses (`src/preload/ui/kit.ts`). Settings save automatically (debounced) like YTM's own settings; there is no Save button. `src/ui/ambient.ts` (`initAmbientBackdrop()`) sets `--ambient-accent`/`-primary`/`-secondary` and the `#ambient-cover` wash from `track-changed` (plus `get_current_track` on open); the miniplayer is the exception, its cover art *is* the backdrop.

### The injected YouTube Music page — and its one hard rule
`src/plugins/ambient/index.ts` (`AmbientLightingPlugin`) paints a full-bleed blurred cover + veil behind the page (`#ytmd-ambient-backdrop`) — the blur is baked once per track into a small bitmap by `renderAmbientWash()` (`color.ts`, also used by `src/ui/ambient.ts`), never a live CSS `filter: blur()`/animation on a full-window layer, and `backdrop-filter` is limited to the thin nav/player bars: WebKitGTK recomposites both on every frame, which made the whole app stutter, and writes `--ytmd-accent`/`-primary`/`-secondary` onto `<html>` per track. `src/plugins/themes/index.ts` + `presets.ts` (`ThemeEnginePlugin`) switch between exactly two static CSS strings — `AMBIENT_THEME_CSS` and `BASE_THEME_CSS` — keyed **solely** off the Ambient Lighting toggle (`ambient_lighting_enabled` / the `set-ambient-enabled` event). There is no separate theme-preset picker any more; that 8-preset system (and the `theme`/`theme_preset` config fields) was removed. Both CSS strings work by overriding YouTube Music's own CSS custom properties (`--ytmusic-*`, `--yt-sys-color-baseline--*`) — that's the *only* mechanism proven both safe and effective for reskinning the native chrome from outside.

**Do not imperatively mutate style on YouTube Music's own Polymer-templated elements from JS** (`ytmusic-nav-bar`, `#nav-bar-background`, `#player-bar-background`, `tp-yt-paper-slider`, anything under `ytmusic-*`/`tp-yt-*`) — no `el.style.setProperty(...)`, no forced-reflow/repaint tricks, even guarded and infrequent. A `<style>` tag with plain `!important` CSS rules targeting those same selectors is fine (that's how the artwork-protection and slider-color rules in `presets.ts` work, safely, today) — the danger is specifically *direct property writes on the elements themselves*, which fight Polymer's own property-effect system for those nodes. This was tried once (forcing `#nav-bar-background`'s translucency to actually repaint, via `offsetHeight` + an opacity nudge) — it worked visually, verified live in Chrome — and then reliably crashed YouTube Music's own renderer in the real app (`Attempted to assign to readonly property` thrown from `scheduler.js`/`music_polymer_inlined_html.js`, blanking the whole page to black). Reverted in commit `a937b69`. If you need to change something about a native YTM element's appearance, find its CSS custom property and override that on `<html>`/`<body>` — never touch the element's `style` directly.

One consequence: `ytmusic-nav-bar`/`ytmusic-player-bar` don't paint their own visible background at all — the real paint happens on separate `#nav-bar-background`/`#player-bar-background` elements (confirmed via `document.elementsFromPoint()` against a live tab). Declarative `!important` rules targeting those two IDs are currently inert (no visible effect) but harmless; don't "fix" that by reaching for JS.

### Injected UI must look like YouTube Music made it
Every control YTMD adds inside the YTM page is built from `src/preload/ui/kit.ts` (icon buttons, menu, toast, dialog, tooltip, chip, progress ring) and labelled through `src/preload/ui/i18n.ts` (`t()`, picks Polish/English from YTM's own `<html lang>`). Kit styles resolve colors through YTM's `--yt-sys-color-baseline--*` properties first, so they follow the Ambient/Base theme like YTM's native menus do; sizes mirror YTM (Roboto 14px, 40px round icon buttons, 12px-radius menus, bottom-left toasts above the player bar). Rules: no `alert()`/`confirm()` (they freeze the page), no inline hover handlers or hardcoded zinc/sky colors, announce outcomes with `showToast`, tooltips via `data-ytmd-tooltip` (not `title`), and add every new string to both locales (`src/tests/ui_kit.test.ts` fails on a missing key). The nav-bar entry point is `src/preload/ui/navMenu.ts` (menu + the listening-together chip the sync plugin drives with `setSyncStatus`).
