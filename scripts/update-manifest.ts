/**
 * Builds the update manifest GitHub Pages serves (`updates/latest.json`)
 * from a release's `latest.json`, and says which release files to copy next
 * to it. The repository is private, so the updater can't download release
 * assets from GitHub; Pages mirrors the newest published release instead
 * (.github/workflows/pages.yml). Every file is still checked by the app
 * against the minisign signature in the manifest, made with the key built
 * into the app, so the host can't swap anything.
 *
 *   bun scripts/update-manifest.ts <release latest.json> <base URL> <tag> <out dir>
 *   -> writes <out dir>/latest.json, prints one asset name per line
 */
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

interface Platform {
  url: string;
  signature: string;
  [key: string]: unknown;
}

interface Manifest {
  version: string;
  platforms: Record<string, Platform>;
  [key: string]: unknown;
}

/** Release asset names: letters, digits and . _ - only (what Tauri produces). */
const SAFE_NAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_TAG = /^v?[0-9A-Za-z][0-9A-Za-z._-]*$/;

export function mirrorManifest(manifest: Manifest, baseUrl: string, tag: string): { manifest: Manifest; files: string[] } {
  if (!SAFE_TAG.test(tag)) throw new Error(`unexpected tag: ${tag}`);
  if (!manifest || typeof manifest.version !== 'string' || !manifest.platforms || typeof manifest.platforms !== 'object') {
    throw new Error('not an updater manifest');
  }
  const base = baseUrl.replace(/\/+$/, '');
  if (!base.startsWith('https://')) throw new Error('the base URL must be https');
  const files = new Set<string>();
  const platforms: Record<string, Platform> = {};
  for (const [key, p] of Object.entries(manifest.platforms)) {
    if (!p || typeof p.url !== 'string' || typeof p.signature !== 'string' || !p.signature) {
      throw new Error(`platform ${key}: missing url or signature`);
    }
    const name = decodeURIComponent(new URL(p.url).pathname.split('/').pop() ?? '');
    if (!SAFE_NAME.test(name)) throw new Error(`platform ${key}: unexpected file name ${name}`);
    files.add(name);
    platforms[key] = { ...p, url: `${base}/updates/${tag}/${name}` };
  }
  return { manifest: { ...manifest, platforms }, files: [...files].sort() };
}

if (import.meta.main) {
  const [input, baseUrl, tag, outDir] = process.argv.slice(2);
  if (!input || !baseUrl || !tag || !outDir) {
    console.error('usage: bun scripts/update-manifest.ts <latest.json> <base URL> <tag> <out dir>');
    process.exit(2);
  }
  const { manifest, files } = mirrorManifest(JSON.parse(readFileSync(input, 'utf8')) as Manifest, baseUrl, tag);
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, 'latest.json'), JSON.stringify(manifest, null, 2) + '\n');
  console.log(files.join('\n'));
}
