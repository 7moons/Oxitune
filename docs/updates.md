# How updates are served

The in-app updater (`plugins.updater` in `src-tauri/tauri.conf.json`) asks
`https://kayzedd.github.io/Oscilla/updates/latest.json`, served by GitHub
Pages.

The repository is private, so the files attached to a GitHub Release can't
be downloaded without a token. Instead `.github/workflows/pages.yml` mirrors
the newest **published** release to Pages whenever a release is published:
it downloads the release's `latest.json` (made by `release.yml` with
`createUpdaterArtifacts`), copies the files it lists into
`/updates/<tag>/`, and publishes a `latest.json` pointing at those copies
(`scripts/update-manifest.ts`). Drafts and pre-releases are never mirrored.

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
traffic ever gets close, move the files to a CDN or make the repository
public and point the manifest at the release files directly.

## Older installs (the Cloudflare Worker)

YTMD 0.2.0 and older ask `https://ytmd-updates.kayzed.workers.dev/latest.json`.
Keep that Worker running until those installs have updated to a version that
asks Pages; after that it can be deleted (its code is in the git history,
`worker/`, before this change).
