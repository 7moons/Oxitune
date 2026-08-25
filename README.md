# YouTube Music Desktop (YTMD)

A modern, ultra-lightweight desktop application for YouTube Music built with **Tauri v2**, **Rust**, and **TypeScript**. Inspired by modern desktop players (like Pear Desktop and th-ch/youtube-music), YTMD offers native system integrations, minimal memory footprint, and a modular plugin architecture.

---

## Features

### Native Desktop Integrations
- **Linux MPRIS (D-Bus)**: Full integration with system media keys, lock screen media widgets, KDE/GNOME player controls, and desktop environments.
- **Discord Rich Presence (RPC)**: Displays the currently playing song title, artist, album art, remaining time, and playback status in Discord.
- **System Tray**: Convenient tray icon with full playback controls (Play/Pause, Next, Previous, Toggle Mini Player, Settings, Hide/Show).
- **Native Notifications**: Desktop notifications on track change with song details.
- **Global & Media Shortcuts**: Control playback globally even when the app is minimized or focused elsewhere.

### Audio & Playback Enhancements
- **Built-in AdBlocker & Anti-Nag**: Automatically skips audio/video ads and dismisses premium upsell banners.
- **SponsorBlock for Music**: Skips non-music intros, outros, and sponsor segments in music videos via the SponsorBlock API.
- **Synchronized Lyrics (LRCLIB)**: Real-time scrolling lyrics synced to playback timestamps with click-to-seek support.
- **Mouse-Wheel Volume**: Smoothly adjust volume by scrolling the mouse wheel anywhere over the player bar.

### UI & Companion Windows
- **Picture-in-Picture Mini Player**: Floating, always-on-top compact player with album art, live progress bar, and playback controls.
- **Preferences & Settings Window**: Easily toggle plugins and customize application behavior.
- **Aesthetic Themes**: Modern high-contrast dark theme and pure OLED black theme without visual clutter.

---

## Project Architecture

```
ytmd/
├── src-tauri/                  # Tauri v2 backend (Rust)
│   ├── src/
│   │   ├── main.rs             # Application binary entry
│   │   ├── lib.rs              # App setup, IPC handlers, and window management
│   │   ├── config.rs           # Persistent configuration manager (~/.config/ytmd/)
│   │   ├── mpris.rs            # Linux MPRIS media controls (souvlaki)
│   │   ├── discord_rpc.rs      # Native Discord IPC socket client
│   │   ├── tray.rs             # System tray menu and events
│   │   └── shortcuts.rs        # Global shortcuts registration
│   ├── icons/                  # High-resolution application icons
│   └── tauri.conf.json         # Tauri v2 configuration
├── src/                        # Frontend & Injectable Core (TypeScript)
│   ├── preload/                # Injected into music.youtube.com
│   │   ├── index.ts            # Preload entry point
│   │   ├── bridge.ts           # Player DOM & media bridge
│   │   └── observer.ts         # MutationObserver & playback state sync
│   ├── plugins/                # Modular plugin engine
│   │   ├── types.ts            # Plugin interface definitions
│   │   ├── registry.ts         # Plugin manager & lifecycle hooks
│   │   ├── adblock/            # Fast ad skipping & popup dismissal
│   │   ├── sponsorblock/       # Non-music segment skipping
│   │   ├── lyrics/             # Synchronized lyrics viewer (LRCLIB)
│   │   ├── volume/             # Mouse wheel volume adjustment
│   │   ├── notifications/      # Track change notifications
│   │   └── visualizer/         # Theme & custom CSS injector
│   ├── ui/                     # Companion UIs
│   │   ├── settings.ts         # Preferences & plugin toggles
│   │   ├── miniplayer.ts       # Compact floating mini player
│   │   └── styles.css          # Anti-slop high-contrast stylesheet
│   └── tests/                  # Test suites
├── index.html                  # Main companion launcher
├── settings.html               # Settings modal window
├── miniplayer.html             # Mini player window
├── package.json
└── vite.config.ts
```

---

## Getting Started

### Prerequisites
- **Rust & Cargo** (1.78+)
- **Bun** or **Node.js** (v20+)
- **System libraries (Linux)**: `webkit2gtk-4.1` (or `webkit2gtk-4.0`), `libappindicator-gtk3`, `librsvg2`

On Arch Linux:
```bash
sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 base-devel
```

On Ubuntu / Debian:
```bash
sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev build-essential
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/dachluczaj/ytmd.git
cd ytmd
```

2. Install dependencies:
```bash
bun install
```

3. Run in development mode:
```bash
bun run tauri dev
```

4. Build for production:
```bash
bun run tauri build
```

---

## Testing

Run unit tests:
```bash
# Frontend & Plugin tests
bun test

# Rust backend tests
cargo test --manifest-path src-tauri/Cargo.toml
```

---

## License
MIT License
