<h1 align="center">Oxitune</h1>

<p align="center">
  <img src="src-tauri/icons/icon.png" width="112" alt="Oxitune logo">
</p>

<p align="center">
  <b>YouTube Music on the desktop, done properly.</b><br>
  Media keys, synced lyrics, a 10-band equalizer, Discord status, Listen Together and a phone remote, in a 7 MB app for Linux and Windows.
</p>

<p align="center">
  <a href="https://github.com/7moons/Oxitune/actions/workflows/ci.yml"><img src="https://github.com/7moons/Oxitune/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/7moons/Oxitune/releases/latest"><img src="https://img.shields.io/github/v/release/7moons/Oxitune.svg" alt="release"></a>
  <a href="https://github.com/7moons/Oxitune/releases"><img src="https://img.shields.io/github/downloads/7moons/Oxitune/total.svg" alt="downloads"></a>
  <img src="https://img.shields.io/badge/platform-Linux%20%7C%20Windows-informational.svg" alt="Linux and Windows">
  <img src="https://img.shields.io/badge/built%20with-Tauri%20v2-24C8DB.svg" alt="Tauri v2">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-GPL--3.0--only-blue.svg" alt="GPL-3.0-only"></a>
</p>

<p align="center">
  <a href="#install">Install</a> ·
  <a href="#features">Features</a> ·
  <a href="#plugins">Plugins</a> ·
  <a href="#how-it-compares">Comparison</a> ·
  <a href="#security">Security</a> ·
  <a href="#limits">Limits</a> ·
  <a href="#legal">Legal</a>
</p>

| **7.4 MB** | **16 MB** | **~530 ms** | **357 MB** |
| :---: | :---: | :---: | :---: |
| Linux `.deb` | the whole binary | from launch to the window on screen | memory at idle, every process (PSS) |

Release build on Linux (WebKitGTK), measured without YouTube Music loaded, so these are the app's
own costs: the YouTube Music page adds its own memory on top. Windows (WebView2) has not been
measured yet.

> Oxitune is an independent, unofficial project. It is not affiliated with, endorsed by or
> sponsored by Google LLC or YouTube. See [Legal](#legal).

## Why Oxitune

- **The real YouTube Music.** Oxitune opens music.youtube.com itself, signed in to your own
  account, and builds around it. Nothing is reimplemented or scraped, so the catalog, your
  library and your recommendations are exactly what you get on the web.
- **A player that belongs on a desktop.** Media keys and the system's media controls, a tray
  menu, global shortcuts, a mini player that stays on top, notifications, sleep inhibition while
  playing and pause on screen lock.
- **Sound you can shape.** A 10-band equalizer with presets, preamp, loudness normalization,
  crossfade, silence skipping and speed with pitch preservation.
- **Lyrics that keep time.** Synced, word by word where the source has it, from eight providers,
  in YouTube Music's own Lyrics tab, the mini player and a fullscreen view.
- **Music together.** Listen Together keeps friends on the same song at the same moment, on your
  network or over the internet, end-to-end encrypted.
- **Small and locked down.** A Tauri app in Rust: the YouTube Music page can reach two narrow,
  validated commands and nothing else, and every update is signed.
- **Yours to extend.** A versioned plugin API with a closed set of permissions and signed
  registries. Oxitune's own features are plugins on that same API.

## Install

Download from the [latest release](https://github.com/7moons/Oxitune/releases/latest):

| System | File | Notes |
| --- | --- | --- |
| Debian, Ubuntu, Mint | `Oxitune_<version>_amd64.deb` | `sudo apt install ./Oxitune_*.deb` |
| Fedora, openSUSE | `Oxitune-<version>-1.x86_64.rpm` | `sudo dnf install ./Oxitune-*.rpm` |
| Any Linux | `Oxitune_<version>_amd64.AppImage` | `chmod +x` and run |
| Windows 10 and 11 | `Oxitune_<version>_x64-setup.exe` | per-user install, no administrator rights |
| Windows, managed | `Oxitune_<version>_x64_en-US.msi` | for deployment tools |

The AppImage and both Windows installers update themselves: Oxitune checks in the background,
offers the new version and verifies it against the signing key built into the app before it runs.
`.deb` and `.rpm` installs are updated by installing the new package. The Windows installers are
not code-signed yet, so SmartScreen asks once on first run.

To build it yourself, see [Development](#development).

## Features

| | Feature | What you get |
| --- | --- | --- |
| **Audio** | Equalizer | 10 bands (32 Hz to 16 kHz), presets and your own, preamp from −24 to +24 dB |
| | Loudness | Normalization so quiet and loud tracks sit together |
| | Transitions | Crossfade (0 to 12 s), skip silence at the start and end of songs |
| | Speed | 0.5× to 2×, optionally keeping the pitch |
| **Desktop** | Media controls | MPRIS on Linux, SMTC on Windows, taskbar preview buttons on Windows |
| | Discord | Rich Presence with the current song and an optional "Listen along" button |
| | Everyday | Tray menu, configurable global shortcuts, notifications, scroll-wheel volume |
| | Behaviour | Sleep inhibition while playing, pause on screen lock, resume the last song, optional autostart |
| | Robustness | Single instance, an offline screen that retries by itself, crash reports in the logs folder |
| | First launch | A short welcome that sets up the essentials and says what goes online, then tips in YouTube Music; again anytime from Settings → About |
| **Lyrics** | Sources | Local `.lrc` and tags, lrc.red, LRCLIB, YouTube Music, Genius; Unison, Musixmatch and NetEase optional |
| | Display | Word-by-word highlighting, duet voices, background vocals, six looks, a fullscreen view |
| | Control | Per-song timing offsets, a "wrong lyrics?" picker, seek by clicking a line |
| | Languages | Optional translation and romanization (through Google Translate, off by default) |
| **Together** | Listen Together | Same song, same moment, over LAN or public MQTT brokers |
| | Roles | Host, moderator, DJ and listener, join approval, vote to skip, reactions, a shared queue, host handoff |
| **Remote** | Phone remote | Playback, volume, queue and search from a phone's browser, paired by QR code; off by default |
| **Library** | Local files | MP3, FLAC, M4A, OGG, Opus and WAV from your music folder, in their own window |
| | Mini player | Always on top, with cover art and lyrics |
| **Look** | Ambient lighting | A soft wash of the current cover behind the page, its color as the accent |
| | Custom CSS | Your own styles over YouTube Music |
| **Data** | One folder | Everything in `~/.oxitune/`, owner-only, with rotated logs |
| | Backup | Export every setting to one file and import it elsewhere |

English and Polish, following the system or YouTube Music language.

## Plugins

Plugins add features without touching the app. Each one declares what it may do in its manifest,
from a closed set of permissions, and you see that list before installing and again before any
update that asks for more.

| Source | How it is trusted |
| --- | --- |
| The official registry, [7moons/oxitune-plugins](https://github.com/7moons/oxitune-plugins) | Built in; its index must be signed with the registry key built into Oxitune |
| Registries you add | Settings → Plugins → Registries, with that registry's own public key |
| A folder on disk | Developer mode only, with a warning |

Every archive must match the checksum in its signed index, installs are atomic, network access is
limited to the hosts a plugin lists, and a plugin that keeps failing is switched off. The official
registry has an example theme, SponsorBlock, an ad blocker and a song saver that uses
[yt-dlp](https://github.com/yt-dlp/yt-dlp).

Writing one: [`docs/PLUGIN_API.md`](docs/PLUGIN_API.md), and the
[example theme](https://github.com/7moons/oxitune-plugins/tree/main/plugins/app.oxitune.example-theme)
to start from.

## How it compares

| | Oxitune | music.youtube.com in a browser |
| --- | :---: | :---: |
| Your library, playlists and recommendations | ✓ | ✓ |
| Media keys and system media controls | ✓ | ✓ |
| Own window, tray and global shortcuts | ✓ | – |
| Always-on-top mini player with lyrics | ✓ | – |
| Synced lyrics from several providers, word by word | ✓ | some songs |
| 10-band equalizer, crossfade, skip silence | ✓ | extension |
| Discord Rich Presence | ✓ | extension |
| Listening together in sync, end-to-end encrypted | ✓ | – |
| Phone remote over Wi-Fi | ✓ | – |
| Local music files in the same app | ✓ | – |
| Signed plugins with declared permissions | ✓ | extensions, broad permissions |
| Memory used by the app itself at idle | 357 MB | one more browser tab |

A browser tab is the lighter choice if you only ever play music in the background. Oxitune is for
when YouTube Music is your music player.

## Security

- **The page is fenced in.** music.youtube.com runs in its own capability with two commands, a
  validated bridge for player state, lyrics, Listen Together and the remote, and nothing else: no
  files, no settings, no updater, no shell. See `src-tauri/capabilities/`,
  `src-tauri/src/bridge.rs` and `src-tauri/src/page_ipc.rs`; the permissions are tested against
  Tauri's mock runtime.
- **Each window gets only its own commands**, and all have a Content Security Policy without
  `unsafe-eval`.
- **Navigation is pinned.** The main window only goes to YouTube Music and Google sign-in; other
  links open in your browser.
- **Listen Together.** A session code is `OXI-` plus 26 characters (130 random bits). HKDF-SHA256
  derives the key and a public topic id from it; every message is encrypted with AES-256-GCM,
  signed with the sender's Ed25519 install key and protected against replay. Brokers and the
  network see an opaque topic id, sizes, timing and IP addresses, never the code, the songs or the
  people.
- **Phone remote.** Off by default. It listens on this PC's LAN address only (or every network if
  you choose), pairs through a token in the QR code that becomes a strict cookie, checks `Host` and
  `Origin`, limits failed attempts and offers nothing but playback control.
- **Updates and builds.** Updates are signed with minisign. Releases are built by GitHub Actions
  with actions pinned to commit hashes and dependency checks (`cargo deny`, `bun audit`) on every
  push.

Found a vulnerability? Report it [privately](https://github.com/7moons/Oxitune/security/advisories/new),
not in a public issue.

## Limits

- **Linux and Windows only.** There is no macOS build.
- **It is the YouTube Music website.** When YouTube changes its page, a feature that reads it can
  break until Oxitune catches up. You need a YouTube Music account, and Premium for what Premium
  gives on the web.
- **Listen Together's code is the secret.** Anyone with it can read along and ask to join, so turn
  on join approval for codes shared widely. A removed member who kept the code can read until the
  session ends; start a new one to cut them off. A first-time guest trusts the first host that
  answers, after which the host's key is pinned.
- **Lyrics** are as good as their providers. Translation and romanization go through Google
  Translate and are off by default.
- **Windows** installers are not code-signed yet, and memory on WebView2 has not been measured.
- **Linux rendering.** Oxitune turns off WebKitGTK's DMA-BUF renderer, which made every window
  flicker on older GPUs. On a recent GPU, `WEBKIT_DISABLE_DMABUF_RENDERER=0` turns it back on.

## Development

Prerequisites: Rust (stable), [Bun](https://bun.sh), and on Linux WebKitGTK 4.1 with its
companions:

| Distribution | Command |
| --- | --- |
| Arch, Manjaro | `sudo pacman -S webkit2gtk-4.1 libappindicator-gtk3 base-devel alsa-lib` |
| Debian, Ubuntu | `sudo apt install libwebkit2gtk-4.1-dev libappindicator3-dev librsvg2-dev libasound2-dev build-essential` |
| Fedora | `sudo dnf install webkit2gtk4.1-devel libappindicator-gtk3-devel librsvg2-devel alsa-lib-devel` |

```sh
bun install
bun run tauri dev                          # run it, with the injected script rebuilt first
bun run tauri build                        # installers in src-tauri/target/release/bundle/

bun run typecheck && bun test              # frontend, well under a second
cd src-tauri
cargo test                                 # backend, about ten seconds
cargo clippy --all-targets -- -D warnings
cargo deny check                           # advisories, licenses, sources
```

<details>
<summary>Layout</summary>

```
src-tauri/src/
  lib.rs                 app setup, main window, plugins and windows wiring
  page_ipc.rs, bridge.rs what the YouTube Music page may see and call
  commands.rs            companion-window commands
  windows.rs             companion windows, created on demand
  nav_policy.rs          where the main window may go
  plugins/               manifests, registries, installs, storage, network
  sync_room.rs, p2p_sync.rs, sync_crypto.rs   Listen Together
  remote_server.rs       phone remote (axum, WebSocket)
  lyrics/                providers, cache, offsets
  mpris.rs, thumbbar.rs, discord_rpc.rs, tray.rs, shortcuts.rs
src/
  preload/               injected into music.youtube.com, bundled as one IIFE
  plugins/               built-in plugins, each with a manifest
  ui/                    settings, library, mini player, Listen Together, offline
  remote/                the phone app
schemas/                 remote and lyrics wire formats
pages/join/              the Listen Together invite page (GitHub Pages)
docs/                    plugin API, update hosting
```

</details>

<details>
<summary>Releasing</summary>

1. `bun scripts/versions.ts set <version>` keeps `package.json`, `Cargo.toml` and
   `tauri.conf.json` in step; CI checks them against the tag.
2. Commit, tag `v<version>` and push the tag. `.github/workflows/release.yml` builds the Linux and
   Windows installers, signs the updater files and opens a **draft** release.
3. Publish the draft. `.github/workflows/pages.yml` copies its update files to GitHub Pages, where
   installed copies find them ([`docs/updates.md`](docs/updates.md)).

Secrets: `TAURI_SIGNING_PRIVATE_KEY` and `TAURI_SIGNING_PRIVATE_KEY_PASSWORD`. The public key (ID
`A721E1BF70C34591`) is in `src-tauri/tauri.conf.json`; replacing the pair makes every installed
copy reject future updates.

</details>

Built on [Tauri](https://tauri.app), [souvlaki](https://github.com/Sinono3/souvlaki) (media
controls), [rumqttc](https://github.com/bytebeamio/rumqttc) (MQTT), [ring](https://github.com/briansmith/ring)
(cryptography), [axum](https://github.com/tokio-rs/axum) (phone remote),
[lofty](https://github.com/Serial-ATA/lofty-rs) (tags) and [Vite](https://vite.dev).

## Contributing

Bug reports are most useful with the logs from Settings → System → Open logs folder and the song
or page where it happened. Pull requests need `bun run typecheck`, `bun test`, `cargo test` and
`cargo clippy --all-targets -- -D warnings` to pass, and a test for what they change: a fix comes
with a test that fails without it. By contributing you agree that your contribution is licensed
under GPL-3.0-only.

## Legal

- **No affiliation.** Oxitune is an independent open source project, not affiliated with, endorsed
  by or sponsored by Google LLC, YouTube, Discord or any lyrics provider. "YouTube" and "YouTube
  Music" are trademarks of Google LLC, named only to say what the app works with.
- **No content.** This repository holds no music, videos, lyrics, artwork or other copyrighted
  media, and no Google or YouTube code or assets. Oxitune shows the official music.youtube.com
  website, which you sign in to with your own account; playback, streams and any protection on
  them are handled by YouTube in that page.
- **No circumvention.** Oxitune contains no code that decrypts, bypasses or modifies a technical
  protection measure (DRM, stream ciphers or signatures), and none that fetches or decodes
  YouTube media streams. Saving songs exists only as an optional plugin that hands a song id to
  [yt-dlp](https://github.com/yt-dlp/yt-dlp), a separate program the user chooses to install.
  Plugins are separate works and the responsibility of their authors and users.
- **Your responsibility.** Use Oxitune in line with YouTube's Terms of Service and the laws of
  your country.
- **Notices.** If you believe something here infringes your rights, open an issue or contact the
  [7moons](https://github.com/7moons) maintainers first, so it can be reviewed and fixed quickly.

## License

[GPL-3.0-only](LICENSE). Copyright © 2026 7moons and contributors.

Plugins in [7moons/oxitune-plugins](https://github.com/7moons/oxitune-plugins) are licensed
separately under MIT.
