# YTMD plugins

Plugins for [YTMD](https://github.com/KayZedd/ytmd), the desktop client for
YouTube Music, and the signed registry YTMD installs them from.

This folder is meant to be pushed as its own repository. YTMD ships with no
registry: users add one in **Settings → Plugins → Registries** with its
address and public key, and YTMD refuses anything that isn't signed with
that key.

| Plugin | What it does | Permissions |
|---|---|---|
| `app.ytmd.example-theme` | The smallest useful plugin: an accent color over YouTube Music | `ui` |
| `app.ytmd.adblock` | Removes ad scheduling from YouTube Music's responses; mutes, hides and skips what slips through | `player:read`, `page`, `ui` |
| `app.ytmd.sponsorblock` | Skips intros, outros and other non-music parts using the SponsorBlock database | `player:read`, `player:control`, `network` (`sponsor.ajay.app`) |

The plugin API itself (manifest, permissions, the `ytmd` object) is
documented in YTMD's [`docs/PLUGIN_API.md`](https://github.com/KayZedd/ytmd/blob/main/docs/PLUGIN_API.md).

## Layout

```
plugins/<id>/manifest.json     what the plugin is and may do
plugins/<id>/main.js           its code (the manifest's "entry")
plugins/<id>/*.css             optional styles (the manifest's "styles")
plugins/<id>/*.test.ts         tests, never packed
scripts/build-index.ts         builds dist/: archives + index.json
.github/workflows/release.yml  on a tag: build, sign, publish to Pages
```

The folder name must be the plugin's `id`.

## Manifest

```json
{
  "id": "com.example.my-plugin",
  "name": "My plugin",
  "version": "1.2.0",
  "apiVersion": 1,
  "description": "One sentence users see before installing.",
  "author": "Your name",
  "homepage": "https://example.com/my-plugin",
  "matches": ["https://music.youtube.com/*"],
  "runAt": "document-idle",
  "permissions": ["player:read", "ui"],
  "hosts": [],
  "entry": "main.js",
  "styles": ["style.css"],
  "settings": [
    { "key": "enabled_feature", "type": "boolean", "label": { "en": "Do the thing", "pl": "Rób to" }, "default": true }
  ]
}
```

- `id`: reverse-DNS, lower case, also the folder name. Never change it.
- `version`: semver. YTMD installs updates automatically when the new
  version asks for **no** new permissions; otherwise the user is asked.
- `apiVersion`: `1`.
- `permissions`: any of `player:read`, `player:control`, `page`, `storage`,
  `network`, `ui`. `network` needs `hosts` (plain host names, https only).
- `runAt`: `document-start` (before YouTube Music's own scripts, e.g. to
  wrap `fetch`) or `document-idle` (default).
- `settings`: rendered in YTMD's Settings; types `boolean`, `number`
  (`min`/`max`), `string`, `select` (`options`). Labels are a string or
  `{ "en": ..., "pl": ... }`.

## Adding a plugin

1. Create `plugins/<id>/` with a manifest and the entry script. Plain
   JavaScript, no build step, no network access outside `hosts`, no native
   code. The entry script gets a `ytmd` object; see the example theme.
2. Export pure functions for tests with
   `if (typeof module !== 'undefined') module.exports = { ... }` and put
   `bun:test` tests next to it (`*.test.ts`, not packed).
3. `bun test && bun scripts/build-index.ts` locally.
4. Open a pull request. Review it like code that runs inside every user's
   YouTube Music session, because it does.
5. To publish, bump `version` in the manifest and push a tag (`v2026.09.24`).

## Signing key (once, by the maintainer)

The registry has its own minisign key, separate from YTMD's updater key.

```sh
minisign -G -p minisign.pub -s registry.key
```

- Commit `minisign.pub`; publish the key line (`RW…`) in this README so
  users can paste it into YTMD.
- Store the full contents of `registry.key` as the repository secret
  `MINISIGN_SECRET_KEY` and its password as `MINISIGN_PASSWORD`, then
  delete the local file or keep it offline.
- Enable GitHub Pages with "GitHub Actions" as the source.

Users add: `https://<owner>.github.io/<repo>/index.json` and the public key.

## What the registry publishes

`index.json` (`format: 1`) lists for every plugin: `id`, `name`, `version`,
`apiVersion`, `description`, `author`, `permissions`, `url` of its
`.tar.gz`, and the archive's `sha256`. `index.json.minisig` signs the whole
index, so the checksums, and through them every archive, are covered by
the registry key. YTMD additionally checks that each archive's manifest
matches its index entry (id, version, permissions) before installing it.
