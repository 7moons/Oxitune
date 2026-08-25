# YouTube Music Desktop (YTMD)

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

### Native Desktop Integration
- **Linux MPRIS (D-Bus)**: Comprehensive media key support, lock screen player controls, KDE/GNOME audio applet integration.
- **Discord Rich Presence (RPC)**: Live status showing current track, artist, album art, remaining duration, and play/pause state.
- **System Tray Menu**: Fast background playback controls (Play/Pause, Next/Prev, Mini Player toggle, Settings, Quit).
- **Native Notifications**: Real-time track change notifications with song title and artist.
- **Global Shortcuts**: Control playback globally even when the window is minimized or unfocused.
- **Power Management**: Automatic system sleep inhibition during playback and optional pause on screen lock.

### Synchronized Lyrics (LRCLIB)
- Injected directly into YouTube Music's native Lyrics tab.
- Precise timestamp synchronization with active line scaling and high-contrast typography.
- Interactive seek-on-click on any lyric verse to jump directly in the song.

### Local Music Library & Offline Player
- Fast directory scanning for local music collections (MP3, FLAC, WAV, AAC, OGG, OPUS, M4A).
- Built-in playback bar with seekbar, volume controls, and track search.
- Animated active equalizer indicators on currently playing local tracks.

### Listen Together (P2P Room Sync)
- Synchronize your YouTube Music playback and queue with friends in real time.
- Generate shareable room codes (`YTMD-XXXX`) with automatic host discovery on local or VPN/Tailscale networks.

### Mobile Web Remote Control
- Instant QR-code local network remote control.
- Control playback, volume, track navigation, and search directly from any smartphone or browser on your local Wi-Fi without installing companion apps.

### Built-in Audio Downloader
- Download tracks in multiple formats (MP3, FLAC, AAC, OPUS, WAV) with embedded metadata and cover artwork.

### Themes & Custom Styling
- Curated colorways: **OLED Pure Black**, **Nord Arctic**, **Catppuccin Mocha**, **Tokyo Night**, **Gruvbox Dark**, **Dracula**, **Rosé Pine**, and **Modern Dark**.
- Full support for user-defined custom CSS injection.

### Configuration
- Persistent, human-readable configuration stored in `~/.ytmd/config.json`.

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
│   │   ├── shortcuts.rs        # Global shortcuts registration
│   │   ├── local_files.rs      # Local directory scanner & metadata extractor
│   │   ├── downloader.rs       # Audio stream downloader
│   │   ├── sync_room.rs        # P2P Listen Together sync protocol
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
│   │   ├── themes/             # Curated themes & custom CSS
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

## Disclaimer

This is an unofficial, open-source community project. It is not affiliated with, endorsed by, or sponsored by Google LLC or YouTube. All trademarks and registered trademarks belong to their respective owners.

---

## License

This project is licensed under the [MIT License](LICENSE).
