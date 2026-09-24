# YTMD

A desktop client for YouTube Music built with **Tauri v2**, **Rust** and **TypeScript**, for Linux and Windows.

YTMD wraps music.youtube.com with what a desktop player should have: media keys and system media controls, Discord status, synced lyrics, an equalizer, a phone remote, a local library, Listen Together sessions with friends, and plugins.

---

## Features

### Audio
- **10-band equalizer** (32 Hz – 16 kHz) with presets and your own saved presets, preamp (−24 to +24 dB), loudness normalization.
- **Crossfade** (0–12 s), **skip silence**, **speed** (0.5×–2×) with optional pitch preservation.

### Desktop integration
- **Media keys and system media controls**: MPRIS on Linux (KDE/GNOME applets, lock screen), SMTC on Windows (media overlay, lock screen), plus previous/play/next buttons in the Windows taskbar preview.
- **Discord Rich Presence** with the current song, and an optional "Listen along" button for your Listen Together session.
- **Tray menu**, notifications, **global shortcuts** (configurable), **sleep inhibition** while playing, pause on screen lock.
- Remembers the main window's and mini player's size and position, resumes the last song on launch, optional **start with the system** (off by default).
- A single instance: launching again brings the window back.
- An **offline screen** with automatic retries instead of a blank window when YouTube Music can't be reached.
- **Crash reports**: a crash leaves a report in the logs folder and the next launch offers to open it.
- Polish and English, following the system/YouTube Music language.

### Lyrics
- Synced lyrics in YouTube Music's own Lyrics tab and in the mini player, from several providers (local `.lrc`/tags, LRCLIB, YouTube Music, Genius; Musixmatch and NetEase optional), with per-song timing offsets and a "wrong lyrics?" picker.

### Listen Together
- Play the same music at the same time as friends, on the same network or over the internet (public MQTT brokers, all tried at once).
- Roles (host, moderator, DJ, listener), join approval, removing people, vote to skip, emoji reactions, a shared queue in place of YouTube Music's "Up next", host handoff when the host leaves.
- **Security** (protocol 3): the session code is `YTMD-` plus 26 characters (130 random bits); the key and the public topic id are derived from it with HKDF-SHA256; every message is encrypted (AES-256-GCM) and **signed by its sender's install key** (Ed25519), with replay protection. Only the host's key can speak for the session and nobody can act under another member's id. Brokers and the local network see an opaque topic id, message sizes and timing, and IP addresses — not the code, the songs or the people.
- **Limits worth knowing**: the code is the session's secret: anyone who has it can read along and ask to join (turn on join approval for codes shared widely; the Discord button turns it on for you). A removed member who kept the code can keep reading until the session ends — start a new session to cut them off. A first-time guest trusts the first host that answers with the code; after that the host's key is pinned.
- Everyone needs YTMD 0.3 or newer; older versions are told to update.

### Phone remote
- Control playback, volume, the queue and search from a phone's browser on the same Wi-Fi, by scanning a QR code in **Settings → Phone remote**.
- **Off by default.** When on, it listens only on this PC's LAN address (or on all networks, if you choose), pairs through a token in the QR code that becomes a strict cookie, checks `Host` and `Origin` (no DNS rebinding or cross-site use), limits failed attempts and message rates, and offers nothing but playback control. "Revoke paired phones" unpairs every phone.

### Local library and mini player
- Scans your music folder (MP3, FLAC, M4A, OGG, Opus, WAV; tags via lofty) off the main thread, re-reading only changed files, and plays it in its own window.
- An always-on-top mini player with cover art and lyrics.

### Look
- **Ambient lighting**: a soft wash of the current cover behind YouTube Music, its color as the accent. Custom CSS (a settings backup's custom CSS is applied only after you confirm it).

### Plugins
- A versioned plugin API ([`docs/PLUGIN_API.md`](docs/PLUGIN_API.md)): a manifest with a closed set of permissions, shown before you install and again before any update that asks for more; per-plugin settings, storage and network access limited to the hosts it lists; errors isolated per plugin, repeatedly failing plugins switched off.
- Install from **registries you add** (YTMD ships none): every registry's index must be signed with the key you entered, every archive must match its signed checksum, installs are atomic. Updates are checked automatically (configurable). Developer mode loads a plugin from a folder, with a warning.
- YTMD's own features are built-in plugins on the same API. A ready-to-publish registry with an example theme, an ad blocker and SponsorBlock lives in [`_plugins-export/`](_plugins-export).

### Settings, data and logs
- Everything is in `~/.ytmd/` (owner-only): `config.json`, the last session, the Listen Together identity, the remote's pairing token, installed plugins, caches and `logs/` (rotated, 5 × 2 MB). Settings → System opens the logs folder.
- Settings backup: export everything to one file, import it elsewhere. An import never changes your folders or turns on the phone remote.

---

## Security at a glance

- The YouTube Music page runs in its own capability: it can reach two narrow commands (a bridge for player state/control, lyrics, Listen Together as a member, the remote's view) and nothing else — no files, no settings, no updater, no shell, no app events. Every command validates its input. Details: `src-tauri/capabilities/`, `src-tauri/src/bridge.rs`, `src-tauri/src/page_ipc.rs`; the ACL is tested with Tauri's mock runtime.
- Each companion window gets only its own commands; all have a Content Security Policy without `unsafe-eval`.
- The main window only navigates to YouTube Music and Google sign-in; links that open new windows go to your browser.
- Updates are signed (minisign); release builds come from GitHub Actions with pinned actions and dependency checks (`cargo deny`, `bun audit`).

See [`AUDIT.md`](AUDIT.md) for the full review, measurements and open decisions.

---

## Performance

Measured on Linux (WebKitGTK), release build, with YouTube Music **not** loaded (the measuring environment couldn't reach it), so these are the app's own costs, not a full session:

| | 0.2.0 | now |
|---|---|---|
| Memory at idle, all processes (PSS) | 618 MB | 357 MB |
| Main window on screen after launch | ~586 ms | ~530 ms |
| Linux `.deb` | 13.5 MB | 7.4 MB |
| Binary | 39.1 MB | 15.9 MB |

YouTube Music itself adds its own page memory on top, and Windows (WebView2) hasn't been measured yet; earlier claims of "under 100 MB" were never measured and are withdrawn. Companion windows are created when first opened (each is a separate web process, ~70 MB) and Settings and the library are closed completely when you close them.

---

## Architecture

```
ytmd/
├── src-tauri/src/
│   ├── lib.rs              app setup, main window, plugins and windows wiring
│   ├── page_ipc.rs         what the YouTube Music page may see and call
│   ├── bridge.rs           the page's command table (validated)
│   ├── commands.rs         companion-window commands
│   ├── windows.rs          companion windows, created on demand
│   ├── nav_policy.rs       where the main window may go
│   ├── connectivity.rs     offline screen
│   ├── plugins/            plugin manifests, registries, installs, storage, network
│   ├── sync_room.rs, sync_room/features.rs, p2p_sync.rs, sync_crypto.rs   Listen Together
│   ├── remote_server.rs    phone remote (axum, WebSocket)
│   ├── lyrics/             lyrics providers, cache, offsets
│   ├── mpris.rs, thumbbar.rs, discord_rpc.rs, tray.rs, shortcuts.rs
│   ├── config.rs, session.rs, secure_fs.rs, crash.rs, i18n.rs
│   └── local_files.rs, power_manager.rs, screen_lock.rs, updater.rs, join_link.rs
├── src/
│   ├── preload/            injected into music.youtube.com (bundled as an IIFE)
│   ├── plugins/            built-in plugins, each with a manifest
│   ├── ui/                 companion windows (settings, library, mini player, Listen Together, offline)
│   └── remote/             the phone app
├── docs/PLUGIN_API.md
└── _plugins-export/        a plugin registry repository, ready to push
```

---

## Building

Prerequisites: Rust (stable), Bun, and on Linux `webkit2gtk-4.1`, `libappindicator-gtk3`, `librsvg2`, `libasound2`:

```bash
# Arch / Manjaro
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 base-devel alsa-lib
# Ubuntu / Debian
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev libasound2-dev build-essential
# Fedora
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel alsa-lib-devel
```

```bash
bun install
bun run tauri dev      # development
bun run tauri build    # installers in src-tauri/target/release/bundle/
```

## Testing

```bash
bun run typecheck && bun test
cd src-tauri && cargo test && cargo clippy --all-targets -- -D warnings && cargo deny check
```

## Releasing

1. `bun scripts/versions.ts set 0.3.0` (keeps `package.json`, `Cargo.toml` and `tauri.conf.json` in step; CI checks them against the tag).
2. Commit, tag `v0.3.0`, push the tag. `.github/workflows/release.yml` builds Linux and Windows installers, signs the updater artifacts and opens a **draft** release; publish it by hand.

Secrets: `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The matching public key (ID `A721E1BF70C34591`) is in `src-tauri/tauri.conf.json`; regenerating the key pair would make every installed copy reject future updates. Windows installers are not code-signed yet (SmartScreen will warn), see `AUDIT.md`.

---

## Disclaimer

An unofficial community project, not affiliated with, endorsed by, or sponsored by Google LLC or YouTube. All trademarks belong to their owners.

## License

[MIT](LICENSE)
