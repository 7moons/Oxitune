# YTMD Plugin API (version 1)

Plugins extend YTMD inside the YouTube Music page: restyle it, react to
what's playing, control the player, keep their own settings and data. Every
plugin, including YTMD's own built-in ones, goes through the same API: a
`manifest.json` that says what it is and what it may do, and a context that
gives it exactly that.

- Plugins are JavaScript and CSS. No native code, no Node, no Tauri APIs.
- Installed plugins come from the **official registry** or **registries the
  user added** (a signed index,
  a checksum for every archive), or, for plugin authors, from a local folder
  in developer mode.
- The example to start from: [`_plugins-export/plugins/app.ytmd.example-theme`](../_plugins-export/plugins/app.ytmd.example-theme).
  The ad blocker and SponsorBlock in the same folder are real-world plugins
  (they used to be part of YTMD).

## A plugin

```
my-plugin/
  manifest.json
  main.js        the entry script
  style.css      optional
```

```json
{
  "id": "com.example.my-plugin",
  "name": "My plugin",
  "version": "1.0.0",
  "apiVersion": 1,
  "description": "What it does, in one sentence.",
  "author": "You",
  "homepage": "https://example.com",
  "matches": ["https://music.youtube.com/*"],
  "runAt": "document-idle",
  "permissions": ["player:read", "ui"],
  "hosts": [],
  "entry": "main.js",
  "styles": ["style.css"],
  "settings": []
}
```

```js
// main.js: `ytmd` is the plugin's API object.
ytmd.player.onTrackChange((track) => {
  ytmd.ui.toast(`${track.title} by ${track.artist}`);
});
```

### Manifest fields

| Field | Required | Rules |
|---|---|---|
| `id` | yes | Reverse-DNS (`com.example.name`), lower-case `a-z0-9-` labels, ≤ 100 chars. Also the install folder's name. |
| `name`, `description`, `author` | yes | Plain text, ≤ 500 chars. |
| `version` | yes | Semver. Compared to decide updates. |
| `apiVersion` | yes | `1`. A plugin for another API version is refused. |
| `homepage` | no | `https://` URL. |
| `matches` | yes | `https://music.youtube.com/…` patterns (YTMD only runs plugins there). |
| `runAt` | no | `document-idle` (default) or `document-start` (before YouTube Music's own scripts). |
| `permissions` | no | From the closed set below. |
| `hosts` | with `network` | Plain host names the plugin may fetch from (`api.example.com`), https only. |
| `entry` | yes | A `.js` file inside the plugin folder (≤ 1 MB). |
| `styles` | no | `.css` files inside the folder (≤ 256 KB each), injected when the plugin starts; need `ui`. |
| `settings` | no | Up to 50 settings, rendered in Settings → Plugins (see below). |

A whole plugin is at most 5 MB and 200 files.

### Permissions

| Permission | Gives | Shown to the user as |
|---|---|---|
| `player:read` | `ytmd.player`: current track, playing state, track/playback/tick events | See what's playing |
| `player:control` | `ytmd.player.play/pause/playPause/next/previous/seek/setVolume` | Control playback |
| `page` | `ytmd.page` (`document`, `getVideo()`), and `window`/`document` as normal globals | Read and change the YouTube Music page |
| `storage` | `ytmd.storage`: the plugin's own key-value store (≤ 1 MB, JSON values) | Store its own data on this computer |
| `network` | `ytmd.net`: https GET to the manifest's `hosts` only, ≤ 1 MB, 10 s, no redirects | Connect to the internet (only the sites listed) |
| `ui` | `ytmd.ui`: toasts, styles; the manifest's `styles` | Show messages and restyle YouTube Music |
| `media:save` | `ytmd.media`: save a song (by video id) with yt-dlp into the user's folder for saved songs | Save songs to your folder for saved songs (with yt-dlp) |

`internal:*` permissions exist for YTMD's built-in plugins (config, lyrics,
Listen Together, phone remote, power, windows, notifications) and are
refused in any other manifest.

The user sees the permission list before installing, and again before any
update that asks for more; such an update waits in Settings until they
agree. Updates that ask for no new permissions install on their own.

## The `ytmd` object

Groups the manifest doesn't grant are `undefined`. The object is frozen.

```ts
interface Ytmd {
  apiVersion: 1;
  plugin: { id: string; name: string; version: string };
  log: { info(...a); warn(...a); error(...a) };   // console, prefixed with the id
  onUnload(fn: () => void): void;                 // switched off, or the page is going away

  settings: {
    all(): Record<string, unknown>;
    get(key: string): unknown;
    onChange(fn: (values) => void): () => void;   // changed in Settings, live
  };

  player?: {                                       // player:read
    getTrack(): Track | null;
    isPlaying(): boolean;
    onTrackChange(fn: (track: Track) => void): () => void;
    onPlaybackChange(fn: (playing: boolean) => void): () => void;
    onTick(fn: (positionSecs: number) => void): () => void;   // ~4 times a second while playing
    canSeekAutomatically(): boolean;   // false while following someone else's playback (Listen Together guest)
    // player:control
    play?(); pause?(); playPause?(); next?(); previous?();
    seek?(positionSecs: number); setVolume?(volume0to1: number);
  };

  page?: { document: Document; getVideo(): HTMLVideoElement | null };   // page

  storage?: {                                      // storage
    get(key): Promise<unknown>; set(key, value): Promise<void>;
    remove(key): Promise<void>; keys(): Promise<string[]>;
  };

  net?: { fetchText(url): Promise<string>; fetchJson(url): Promise<unknown> };  // network

  ui?: { toast(text: string): void; addStyle(css: string): () => void };        // ui

  media?: {                                        // media:save
    formats: readonly ('mp3' | 'm4a' | 'opus' | 'flac')[];
    save(videoId: string, options?: { format?: string }): Promise<string>;  // job id
    cancel(job: string): Promise<void>;
    onProgress(fn: (p: MediaProgress) => void): () => void;
  };
}

interface MediaProgress {
  job: string; videoId: string; percent: number;   // 0–100
  state: 'queued' | 'downloading' | 'converting' | 'done' | 'failed' | 'cancelled';
  file: string | null;    // the saved file's name (never its folder), when done
  error: string | null;   // e.g. "plugins.error.ytdlpMissing", "plugins.error.mediaFailed:<yt-dlp's last line>"
}

interface Track {
  title: string; artist: string; album?: string; coverUrl?: string;
  durationSecs: number; currentTimeSecs: number; isPlaying: boolean;
  videoId?: string; playlistId?: string;
}
```

Player commands go through the same path as media keys and the tray, so in
a Listen Together room a guest's `next()` becomes a request to the host,
like the guest pressing the button.

### Settings

```json
{ "key": "accent", "type": "select", "label": { "en": "Accent", "pl": "Akcent" },
  "default": "red", "options": [{ "value": "red", "label": "Red" }, { "value": "teal", "label": "Teal" }] }
```

Types: `boolean`, `number` (`min`, `max`), `string`, `select` (`options`).
Labels and descriptions are a string or `{ "en": ..., "pl": ... }` (`en`
required). Stored values are checked against the schema; anything invalid
falls back to `default`.

### Saving songs (`media:save`)

YTMD runs yt-dlp for the plugin; the plugin never runs anything itself.
The user installs yt-dlp (and ffmpeg) — YTMD never downloads them — and
picks the folder in Settings → Plugins (default: the system's music folder
+ `YTMD`). The plugin supplies only an 11-character video id and a format
from `formats`; the command line is fixed (`--ignore-config`, no shell, the
URL is always `music.youtube.com/watch?v=<id>`, files go only into that
folder, existing files are never overwritten). Two songs are saved at a
time, at most 20 wait; a plugin can cancel only its own jobs, and switching
it off or removing it cancels them. The example is
[`app.ytmd.downloader`](../_plugins-export/plugins/app.ytmd.downloader).

## Lifecycle and errors

- An enabled plugin's code runs once per page load, at `runAt`.
- **Switching a plugin off** takes effect right away: `onUnload` callbacks
  run, its styles are removed and it stops receiving events.
- **Switching on, installing and updating** take effect after YTMD restarts
  (Settings shows a Restart button; the song resumes where it was). The
  plugin's code is added to the page when the main window is created, which
  is also how it runs before YouTube Music's own scripts.
- Every callback runs isolated: an exception or a rejected promise is logged
  and counted, never passed on to YouTube Music or other plugins. After
  **5 errors** a plugin is switched off (and marked so in Settings) until
  the user turns it back on.

## Security model (read this)

Installed plugins run **in the YouTube Music page** — the same JavaScript
realm as YouTube's own scripts, like a browser user script. That has
consequences plugin users and authors should know:

- The real security boundary is what the page itself can do. YTMD gives the
  YouTube Music page only a narrow bridge (player state and control,
  lyrics, Listen Together as a member, the phone remote's view): no files,
  no settings, no updater, no shell (see `src-tauri/src/bridge.rs` and
  `capabilities/main.json`). A plugin can never do more than that, whatever
  its manifest says.
- Within that, the manifest is enforced where YTMD can enforce it: storage
  and network are checked in the backend against the plugin's install
  (enabled, granted, `hosts`), and `ytmd` only has the granted groups.
  Inside the page, a malicious plugin can still reach page-level things
  directly (the DOM, YouTube's own requests, the bridge), just as any
  script YouTube runs could. Permissions describe and limit a
  well-behaved plugin; **trust comes from the registry you added**.
- The Tauri globals are shadowed in the plugin's scope and plugins get no
  API to the rest of YTMD, but that's hygiene, not a sandbox.
- Registries: YTMD has the official one built in (its key is compiled in;
  the user can remove it) and the user can add others. A registry's
  `index.json` must be signed (minisign, Ed25519) by that registry's key; each archive
  must match the SHA-256 in that signed index, and the manifest inside
  must match its index entry (id, version, permissions). Archives are
  unpacked into a staging folder with no absolute paths, `..`, links or
  special files, checked, and only then swapped in atomically.
- Developer mode loads a folder as is, with a warning. Its code isn't
  checked by anyone; if its manifest later asks for more permissions, it
  stops loading until re-added.

## Registries

A registry is a static site with:

- `index.json`: `{ "format": 1, "name": "...", "plugins": [ { "id", "name",
  "version", "apiVersion", "description", "author", "permissions", "url",
  "sha256" } ] }`, `url` being the plugin's `.tar.gz` (https).
- `index.json.minisig`: `minisign -S -m index.json` with the registry key.

[`_plugins-export/`](../_plugins-export) contains a complete registry
repository: plugins, the index builder, and a GitHub Actions workflow that
builds, hashes, signs and publishes on every tag.

YTMD checks every registry for updates shortly after start and then every
6/12/24 hours (Settings → Plugins; 0 = never).

## Developing a plugin

1. Write `manifest.json` and `main.js` in a folder.
2. Settings → Plugins → Developer → **Choose folder**, read the warning,
   pick the folder, switch the plugin on, restart YTMD.
3. Edit, restart YTMD to reload. Logs from `ytmd.log` appear in the page's
   console (developer tools in a debug build).
4. To publish, open a pull request against a registry repository.

## Built-in plugins

YTMD's own features (lyrics, equalizer, ambient lighting, Listen Together,
phone remote, …) are plugins with manifests in `src/plugins/*/manifest.json`
(ids `app.ytmd.*`), written in TypeScript against `PluginContext` in
`src/plugins/types.ts`: the same hooks (`onInit`, `onTrackChange`,
`onPlaybackChange`, `onTick`, `onDestroy`) and a context scoped to their
permissions (`src/plugins/registry.ts`). Tests fail if a built-in calls a
backend command or listens to an event its permissions don't cover.

## Versioning

`apiVersion` changes only for breaking changes; additions (new optional
groups, fields, events) keep it. YTMD refuses plugins for an API version it
doesn't speak and tells the user a newer YTMD is needed.
