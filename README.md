# YTMD

A high-performance, lightweight, and extensible desktop client for YouTube Music built with **Tauri v2**, **Rust**, and **TypeScript**.

YTMD provides native operating system integration, minimal memory overhead (<100MB RAM), studio-grade audio processing (DSP Equalizer, Crossfade, Silence Skipping), synchronized lyrics, mobile web remote, offline local library playback, and community room sync.

---

## Key Features

### Audio DSP Studio & Equalizer
- **10-Band Graphic Equalizer**: Precise frequency shaping (32Hz – 16kHz) with studio presets (Bass Boost, Vocal, Electronic, Rock, Acoustic, Flat).
- **Preamp Gain & Normalization**: Custom pre-amplification (-24 dB to +24 dB) and dynamic loudness normalization.
- **Seamless Crossfade**: Smooth audio transitions between consecutive tracks (0s to 12s configurable).
- **Skip Silence**: Automatic smart detection and skipping of silent pauses at the beginning and end of tracks.
- **Speed & Pitch Control**: Custom playback speed (0.5x – 2.0x) with optional pitch preservation.
- **Your Own Presets**: Save any equalizer curve (with its preamp) under a name, pick it later, overwrite or delete it.

### Native Desktop Integration
- **Linux MPRIS (D-Bus)**: Comprehensive media key support, lock screen player controls, KDE/GNOME audio applet integration.
- **Discord Rich Presence (RPC)**: Live status showing current track, artist, album art, remaining duration, and play/pause state.
- **System Tray Menu**: Fast background playback controls (Play/Pause, Next/Prev, Mini Player toggle, Settings, Quit).
- **Native Notifications**: Real-time track change notifications with song title and artist.
- **Global Shortcuts**: Media keys by default; set your own for play/pause, next, previous, like, dislike and mute in Settings > System. They work even when the window is hidden.
- **Power Management**: Automatic system sleep inhibition during playback and optional pause on screen lock.
- **Auto-Updates**: Checks for new signed releases shortly after launch and lets you install them with one click from Settings > About & Updates.

### Synchronized Lyrics (LRCLIB)
- Injected directly into YouTube Music's native Lyrics tab.
- Precise timestamp synchronization with active line scaling and high-contrast typography.
- Interactive seek-on-click on any lyric verse to jump directly in the song.

### Local Music Library & Offline Player
- Fast directory scanning for local music collections (MP3, FLAC, WAV, AAC, OGG, OPUS, M4A).
- Built-in playback bar with seekbar, volume controls, and track search.
- Animated active equalizer indicators on currently playing local tracks.

### Listen Together (P2P Room Sync)
- Synchronize your YTMD playback and queue with friends in real time.
- Generate shareable room codes (`YTMD-XXXX`) with automatic host discovery on local or VPN/Tailscale networks, and over the internet through public MQTT brokers (all tried at once).
- Roles: the host makes people moderators, DJs (control playback) or listeners (listen only) and picks the role newcomers get.
- The host and moderators can remove people; a removed install can't rejoin that session until the host lets it back in.
- Optional join approval: newcomers wait until the host lets them in.
- Shared queue: in a session, YouTube Music's "Up next" tab becomes "Queue" and shows the room's shared queue; "Add to queue" and "Play next" from any song's ⋮ menu add to it, DJs reorder it by dragging, and the host plays from it as each song ends or on any skip. Everyone can react with emoji and vote to skip (a majority skips).
- The host can hand the session to someone else; if the host leaves or vanishes, the next person in line takes over under the same code and everyone reconnects on their own.
- End-to-end encrypted with a key derived from the room code: the public brokers and the local network only see opaque bytes.
- "Check connection" tells whether the current network can reach the sync servers.
- Everyone in a session needs a YTMD release newer than 0.1.1 (sync protocol 2); older guests are turned away.

### Mobile Web Remote Control
- Instant QR-code local network remote control.
- Control playback, volume, track navigation, and search directly from any smartphone or browser on your local Wi-Fi without installing companion apps.

### Built-in Audio Downloader
- Download tracks in multiple formats (MP3, FLAC, AAC, OPUS, WAV) with embedded metadata and cover artwork.

### Look & Custom Styling
- **Ambient Lighting**: a soft, blurred wash of the current song's cover behind YouTube Music, with the cover's color as the accent (intensity adjustable, or off for YouTube Music's own look).
- Full support for user-defined custom CSS injection.

### Configuration
- Persistent, human-readable configuration stored in `~/.ytmd/config.json`.
- **Settings Backup**: export everything (equalizer presets and shortcuts included) to one file and import it on another computer.
- **Logs**: written to `~/.ytmd/logs/` (rotated, 5 files kept); Settings > System opens the folder.

---

## Architecture Overview

```
ytmd/
├── src-tauri/                  # Tauri v2 Backend (Rust)
│   ├── src/
│   │   ├── main.rs             # Application binary entry
│   │   ├── lib.rs              # App orchestration and Tauri plugin setup
│   │   ├── commands.rs         # IPC command handlers
│   │   ├── config.rs           # Persistent config manager (~/.ytmd/config.json)
│   │   ├── mpris.rs            # Linux MPRIS integration (D-Bus)
│   │   ├── discord_rpc.rs      # Native Discord IPC socket client
│   │   ├── tray.rs             # System tray menu and lifecycle
│   │   ├── shortcuts.rs        # Configurable global shortcuts
│   │   ├── local_files.rs      # Local directory scanner & metadata extractor
│   │   ├── downloader.rs       # Audio stream downloader
│   │   ├── sync_room.rs        # Listen Together: rooms, roles, LAN transport, handoff
│   │   ├── sync_room/features.rs # Join approval, votes, reactions, shared queue
│   │   ├── p2p_sync.rs         # Listen Together over public MQTT brokers
│   │   ├── sync_crypto.rs      # End-to-end encryption keyed by the room code
│   │   ├── remote_server.rs    # Local web remote HTTP & WebSocket server
│   │   └── power_manager.rs    # System sleep inhibitor and lock watcher
│   ├── icons/                  # Application icons
│   └── tauri.conf.json         # Tauri v2 configuration
├── src/                        # Frontend & Webview Core (TypeScript)
│   ├── preload/                # Webview bridge injected into music.youtube.com
│   │   ├── index.ts            # Entrypoint and burger menu injector
│   │   ├── bridge.ts           # Player DOM interaction bridge
│   │   └── observer.ts         # MutationObserver & playback state sync
│   ├── plugins/                # Modular plugin architecture
│   │   ├── audio-dsp/          # Web Audio API 10-band equalizer & filters
│   │   ├── lyrics/             # Synchronized lyrics viewer (LRCLIB)
│   │   ├── adblock/            # Fast ad skipping & popup dismissal
│   │   ├── sponsorblock/       # Non-music segment skipping
│   │   ├── themes/             # Ambient/Base look & custom CSS
│   │   ├── sync-room/          # Listen Together on the page, shared-queue panel
│   │   ├── ambient/            # Ambient canvas lighting effect
│   │   ├── remote/             # Mobile web remote UI & QR modal
│   │   └── volume/             # Mouse wheel volume adjustment
│   ├── ui/                     # Standalone Companion Windows
│   │   ├── settings.ts         # Preferences & DSP Equalizer interface
│   │   ├── local.ts            # Local Music Library interface
│   │   ├── miniplayer.ts       # Compact floating Mini Player
│   │   ├── sync.ts             # Listen Together Room Sync interface
│   │   └── styles.css          # Unified anti-slop design system
│   └── tests/                  # Frontend test suites (Bun test)
├── index.html                  # Companion launcher
├── settings.html               # Settings modal window
├── local.html                  # Local music library window
├── miniplayer.html             # Mini player window
├── sync.html                   # Listen Together window
├── package.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites

- **Rust & Cargo** (1.78+)
- **Bun** (recommended) or **Node.js** (v20+)
- **System dependencies (Linux)**: `webkit2gtk-4.1`, `libappindicator-gtk3`, `librsvg2`, `libasound2-dev`

#### Arch Linux / Manjaro:
```bash
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 base-devel alsa-lib
```

#### Ubuntu / Debian:
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev libasound2-dev build-essential
```

#### Fedora:
```bash
sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel alsa-lib-devel
```

---

### Building and Running

1. **Clone the repository**:
   ```bash
   git clone https://github.com/dachluczaj/ytmd.git
   cd ytmd
   ```

2. **Install dependencies**:
   ```bash
   bun install
   ```

3. **Start in development mode**:
   ```bash
   bun run tauri dev
   ```

4. **Build production binary**:
   ```bash
   bun run tauri build
   ```
   The compiled binary and `.deb` / `.rpm` / `.AppImage` packages will be placed in `src-tauri/target/release/bundle/`.

---

## Testing

Run unit test suites across frontend and backend:

```bash
# TypeScript & Plugin tests
bun test

# Rust backend tests
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## Releasing a New Version

Releases are built and published by `.github/workflows/release.yml`, which also generates the signed `latest.json` manifest the in-app updater polls (`src-tauri/tauri.conf.json` -> `plugins.updater.endpoints`).

1. Bump the version in **all three** places so they stay in sync: `package.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json`.
2. Commit, then tag and push:
   ```bash
   git tag v1.0.1
   git push origin v1.0.1
   ```
3. The workflow builds Linux (`.deb`/`.rpm`/`.AppImage`) and Windows (`.msi`/`.exe`) installers, signs the updater artifacts, and opens a **draft** GitHub Release with everything attached. Review it and publish it manually — the updater only sees non-draft releases.

The workflow needs two repository secrets (Settings > Secrets and variables > Actions):

| Secret | What it is |
| --- | --- |
| `TAURI_SIGNING_PRIVATE_KEY` | The updater signing private key (generate once with `bunx tauri signer generate -w /path/to/key.pem`, keep the file out of git) |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | The password you set when generating that key |

The matching public key is already committed in `src-tauri/tauri.conf.json` (`plugins.updater.pubkey`) — it's what lets running copies of YTMD verify that an update actually came from you. If the private key is ever regenerated, that pubkey must be updated to match or every existing install will reject future updates. The current key pair has ID `A721E1BF70C34591` (the first line of the `.pub` file, base64-decoded, ends with it) — check a key against that before assuming it's the right one.

---

## Disclaimer

This is an unofficial, open-source community project. It is not affiliated with, endorsed by, or sponsored by Google LLC or YouTube. All trademarks and registered trademarks belong to their respective owners.

---

## License

This project is licensed under the [MIT License](LICENSE).
