# Contributing to Oxitune

Thanks for helping. Setup and build steps are in the [README](README.md#development).

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
