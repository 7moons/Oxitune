/**
 * One version for the whole app, kept in three files: package.json,
 * src-tauri/Cargo.toml and src-tauri/tauri.conf.json (the updater and the
 * installers read the last one).
 *
 *   bun scripts/versions.ts check           # CI: all three agree
 *   bun scripts/versions.ts check v0.3.0    # release: and match the tag
 *   bun scripts/versions.ts set 0.3.0       # bump all three
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = join(import.meta.dir, '..');
const files = {
  package: join(root, 'package.json'),
  cargo: join(root, 'src-tauri', 'Cargo.toml'),
  tauri: join(root, 'src-tauri', 'tauri.conf.json')
};

const SEMVER = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/;
const CARGO_VERSION = /^version = "([^"]+)"$/m;

export function readVersions(): Record<keyof typeof files, string | undefined> {
  return {
    package: JSON.parse(readFileSync(files.package, 'utf8')).version,
    cargo: readFileSync(files.cargo, 'utf8').match(CARGO_VERSION)?.[1],
    tauri: JSON.parse(readFileSync(files.tauri, 'utf8')).version
  };
}

function setVersion(version: string) {
  const pkg = JSON.parse(readFileSync(files.package, 'utf8'));
  pkg.version = version;
  writeFileSync(files.package, JSON.stringify(pkg, null, 2) + '\n');
  // Only the [package] version: the first `version = ` line in Cargo.toml.
  writeFileSync(files.cargo, readFileSync(files.cargo, 'utf8').replace(CARGO_VERSION, `version = "${version}"`));
  const conf = JSON.parse(readFileSync(files.tauri, 'utf8'));
  conf.version = version;
  writeFileSync(files.tauri, JSON.stringify(conf, null, 2) + '\n');
}

if (import.meta.main) {
  const [cmd, arg] = process.argv.slice(2);
  if (cmd === 'set') {
    if (!arg || !SEMVER.test(arg)) {
      console.error('usage: bun scripts/versions.ts set <semver>');
      process.exit(2);
    }
    setVersion(arg);
    console.log(`version set to ${arg} (run cargo check to refresh Cargo.lock)`);
  } else if (cmd === 'check') {
    const v = readVersions();
    const distinct = new Set(Object.values(v));
    const problems: string[] = [];
    if (distinct.size !== 1) problems.push(`versions differ: ${JSON.stringify(v)}`);
    if (!SEMVER.test(v.package ?? '')) problems.push(`not semver: ${v.package}`);
    if (arg && arg.replace(/^v/, '') !== v.package) problems.push(`tag ${arg} != version ${v.package}`);
    if (problems.length) {
      console.error(problems.join('\n'));
      process.exit(1);
    }
    console.log(`version ${v.package} consistent`);
  } else {
    console.error('usage: bun scripts/versions.ts check [tag] | set <semver>');
    process.exit(2);
  }
}
