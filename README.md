# Oxitune

A desktop client for YouTube Music for Linux and Windows, built with **Tauri v2**, **Rust** and **TypeScript**.

Oxitune opens music.youtube.com in its own window and adds what a desktop player should have: media keys and system media controls, Discord status, synced lyrics, an equalizer, a phone remote, a local library, Listen Together sessions with friends, and plugins.

Maintained by [7moons](https://github.com/7moons). Plugins live in [7moons/oxitune-plugins](https://github.com/7moons/oxitune-plugins).

> Oxitune is an independent, unofficial project. It is not affiliated with, endorsed by or sponsored by Google LLC or YouTube. See [Legal](#legal).

---

## Features

### Audio
- **10-band equalizer** (32 Hz – 16 kHz) with presets and your own saved presets, preamp (−24 to +24 dB), loudness normalization.
- **Crossfade** (0–12 s), **skip silence**, **speed** (0.5×–2×) with optional pitch preservation.

### Desktop integration
- **Media keys and system media controls**: MPRIS on Linux, SMTC on Windows, plus previous/play/next buttons in the Windows taskbar preview.
- **Discord Rich Presence** with the current song, and an optional "Listen along" button for your Listen Together session.
- **Tray menu**, notifications, configurable **global shortcuts**, **sleep inhibition** while playing, pause on screen lock.
- Remembers window sizes and positions, resumes the last song on launch, optional **start with the system** (off by default).
- Single instance, an **offline screen** with automatic retries, crash reports in the logs folder.
- English and Polish, following the system or YouTube Music language.

### Lyrics
- Synced lyrics in YouTube Music's Lyrics tab and in the mini player, from several providers (local `.lrc`/tags, lrc.red, LRCLIB, YouTube Music, Genius; Unison, Musixmatch and NetEase optional), with per-song timing offsets and a "wrong lyrics?" picker.
- Word-by-word highlighting where the source has it, duet voices, background vocals, a fullscreen lyrics view and six looks to pick from.
- Optional translation and romanization (through Google Translate, off by default).
- Lyrics are fetched from those services at play time and cached locally; Oxitune ships no lyrics.

### Listen Together
- Play the same music at the same time as friends, on the same network or over the internet (public MQTT brokers, all tried at once).
- Roles (host, moderator, DJ, listener), join approval, removing people, vote to skip, emoji reactions, a shared queue, host handoff.
- **Security**: the session code is `OXI-` plus 26 characters (130 random bits); the key and the public topic id are derived from it with HKDF-SHA256; every message is encrypted (AES-256-GCM) and signed by its sender's install key (Ed25519), with replay protection. Brokers and the local network see an opaque topic id, message sizes, timing and IP addresses, never the code, the songs or the people.
- **Limits**: the code is the session's secret. Anyone who has it can read along and ask to join (turn on join approval for codes shared widely). A removed member who kept the code can keep reading until the session ends. A first-time guest trusts the first host that answers; after that the host's key is pinned.

### Phone remote
- Control playback, volume, the queue and search from a phone's browser on the same Wi-Fi, by scanning a QR code in **Settings → Phone remote**.
- **Off by default.** Listens only on this PC's LAN address (or on all networks if you choose), pairs through a token that becomes a strict cookie, checks `Host` and `Origin`, rate-limits, and offers nothing but playback control.

### Local library and mini player
- Scans your music folder (MP3, FLAC, M4A, OGG, Opus, WAV) off the main thread and plays it in its own window.
- An always-on-top mini player with cover art and lyrics.

### Look
- **Ambient lighting** from the current cover, and custom CSS.

### Plugins
- A versioned plugin API ([`docs/PLUGIN_API.md`](docs/PLUGIN_API.md)): a manifest with a closed set of permissions shown before install and before any update that asks for more, per-plugin settings and storage, network access limited to the hosts a plugin lists, errors isolated per plugin.
- Install from the built-in **official registry** ([7moons/oxitune-plugins](https://github.com/7moons/oxitune-plugins)) or **registries you add**. Every index must be signed with its registry's key and every archive must match its signed checksum. Developer mode loads a plugin from a folder.
- Oxitune's own features are built-in plugins on the same API.

### Settings, data and logs
- Everything is in `~/.oxitune/` (owner-only): `config.json`, the last session, the Listen Together identity, the remote's pairing token, installed plugins, caches and rotated `logs/`.
- Settings backup: export everything to one file and import it elsewhere.

---

## Security at a glance

- The YouTube Music page runs in its own capability with two narrow commands (a validated bridge for player state, lyrics, Listen Together and the remote) and nothing else: no files, no settings, no updater, no shell. See `src-tauri/capabilities/`, `src-tauri/src/bridge.rs`, `src-tauri/src/page_ipc.rs`.
- Each companion window gets only its own commands; all have a Content Security Policy without `unsafe-eval`.
- The main window only navigates to YouTube Music and Google sign-in; other links open in your browser.
- Updates are signed (minisign). Release builds come from GitHub Actions with pinned actions and dependency checks (`cargo deny`, `bun audit`).

Found a vulnerability? Open a [private security advisory](https://github.com/7moons/Oxitune/security/advisories/new) instead of a public issue.

---

## Architecture

```
Oxitune/
├── src-tauri/src/
│   ├── lib.rs              app setup, main window, plugins and windows wiring
│   ├── page_ipc.rs         what the YouTube Music page may see and call
│   ├── bridge.rs           the page's command table (validated)
│   ├── commands.rs         companion-window commands
│   ├── windows.rs          companion windows, created on demand
│   ├── nav_policy.rs       where the main window may go
│   ├── connectivity.rs     offline screen
│   ├── plugins/            plugin manifests, registries, installs, storage, network
│   ├── sync_room.rs, sync_room/, p2p_sync.rs, sync_crypto.rs   Listen Together
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
├── schemas/                remote and lyrics wire formats
├── pages/join/             the Listen Together invite page (GitHub Pages)
└── docs/                   plugin API, update hosting
```

---

## Building

Prerequisites: Rust (stable), [Bun](https://bun.sh), and on Linux `webkit2gtk-4.1`, `libappindicator-gtk3`, `librsvg2`, `libasound2`:

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

1. `bun scripts/versions.ts set <version>` keeps `package.json`, `Cargo.toml` and `tauri.conf.json` in step (CI checks them against the tag).
2. Commit, tag `v<version>`, push the tag. `.github/workflows/release.yml` builds the Linux and Windows installers, signs the updater artifacts and opens a **draft** release.
3. Publish the draft. `.github/workflows/pages.yml` copies its update files to GitHub Pages, where installed copies find them ([`docs/updates.md`](docs/updates.md)).

Secrets: `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The matching public key (ID `A721E1BF70C34591`) is in `src-tauri/tauri.conf.json`; replacing the key pair makes every installed copy reject future updates. Windows installers are not code-signed yet, so SmartScreen warns on first run.

## Contributing

Issues and pull requests are welcome. Keep `bun run typecheck`, `bun test`, `cargo test` and `cargo clippy --all-targets -- -D warnings` green, and add a test with every fix. By contributing you agree that your contribution is licensed under GPL-3.0-only.

---

## Legal

- **No affiliation.** Oxitune is an independent open source project. It is not affiliated with, endorsed by or sponsored by Google LLC, YouTube, Discord or any lyrics provider. "YouTube" and "YouTube Music" are trademarks of Google LLC, used here only to say what the app works with. All other trademarks belong to their owners.
- **No content.** This repository contains no music, videos, lyrics, artwork or other copyrighted media, and no Google or YouTube code or assets. Oxitune shows the official music.youtube.com website, which you sign in to with your own account; playback, streams and any protection on them are handled entirely by YouTube in that page.
- **No circumvention.** Oxitune contains no code that decrypts, bypasses or modifies any technical protection measure (DRM, stream ciphers or signatures), and none that fetches or decodes YouTube media streams. Saving songs exists only as an optional plugin that hands a song id to [yt-dlp](https://github.com/yt-dlp/yt-dlp), a separate program the user chooses to install. Plugins are separate works installed by the user and are the responsibility of their authors and users.
- **Your responsibility.** You are responsible for using Oxitune in line with YouTube's Terms of Service and the laws of your country.
- **Notices.** If you believe something in this repository infringes your rights, open an issue or contact the [7moons](https://github.com/7moons) maintainers first, so it can be reviewed and fixed quickly, before filing a formal notice.

## License

Oxitune is licensed under the [GNU General Public License v3.0 only](LICENSE) (GPL-3.0-only). Copyright © 2026 7moons and contributors.

Plugins in [7moons/oxitune-plugins](https://github.com/7moons/oxitune-plugins) are licensed separately under MIT.
