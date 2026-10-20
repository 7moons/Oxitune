# How updates are served

The in-app updater (`plugins.updater` in `src-tauri/tauri.conf.json`) asks
`https://7moons.github.io/Oxitune/updates/latest.json`, served by GitHub
Pages.

`.github/workflows/pages.yml` mirrors the newest **published** release to
Pages whenever a release is published: it downloads the release's
`latest.json` (made by `release.yml` with `createUpdaterArtifacts`), copies
the files it lists into `/updates/<tag>/`, and publishes a `latest.json`
pointing at those copies (`scripts/update-manifest.ts`). Drafts and
pre-releases are never mirrored. The same Pages site serves the Listen
Together invite page (`pages/join/`).

Pages is only a mirror. Every update is checked by the app against the
minisign signature inside `latest.json`, made with the updater key whose
public half is built into the app (key id `A721E1BF70C34591`), so neither
Pages nor anyone else can slip in a different file.

## Releasing

1. `bun scripts/versions.ts set <version>`, commit, push a `v<version>` tag.
2. `release.yml` builds and signs the installers into a **draft** release.
3. Publish the draft on GitHub. That runs `pages.yml`, which puts the update
   on Pages; installed copies see it at their next check.

To re-publish by hand: Actions → pages → Run workflow.

## Limits

GitHub Pages sites are limited to 1 GB and ~100 GB of traffic a month (soft).
Only the newest release is mirrored (~130 MB with the Linux AppImage). If
traffic ever gets close, point the manifest at the release files directly.
