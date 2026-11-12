# Contributing to Oxitune

Thanks for helping. Setup and build steps are in the [README](README.md#development).

## Sign-off (DCO)

Every commit needs a sign-off line. It certifies the [Developer Certificate of Origin](https://developercertificate.org): you wrote the change, or you have the right to submit it under the project's license (GPL-3.0). There is no paperwork and no agreement to sign; the rights stay with you.

```bash
git commit -s -m "your message"     # appends: Signed-off-by: Your Name <you@example.com>
git commit --amend -s               # add it to the last commit
git rebase --signoff main           # add it to every commit of a branch
```

The name and email come from your git config. Pull requests with unsigned commits are asked to add the sign-off before they are merged. Bots such as Dependabot are exempt.

## Before a pull request

These are the checks CI runs (`.github/workflows/ci.yml`); run them first:

```bash
bun install --frozen-lockfile
bun scripts/versions.ts check
bun run typecheck
bun test
cd src-tauri && cargo test --locked && cargo clippy --locked --all-targets -- -D warnings
```

## Ground rules

- One change per pull request, with a test where the change is testable.
- Security-sensitive code (`src-tauri/src/bridge.rs`, `page_ipc.rs`, `capabilities/`) needs a test
  for every new permission.
- Plugin authors: see [docs/PLUGIN_API.md](docs/PLUGIN_API.md).
- Questions and ideas go to [Discussions](https://github.com/7moons/Oxitune/discussions), bugs to issues.
