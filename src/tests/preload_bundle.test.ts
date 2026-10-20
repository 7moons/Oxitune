import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { createContext, runInContext } from 'vm';

const root = join(import.meta.dir, '..', '..');

// preload.js runs as a classic script in YouTube Music's own global scope.
// Unwrapped, every minified top-level name became a page global: the
// Listen Together guest flag was minified to `yt`, so joining a room as a
// guest set `window.yt = true`, wiping out YouTube's `yt.*` namespace
// ("Cannot create property 'logging' on boolean 'true'", empty queue and
// player bar). Any other name could shadow YTM's globals the same way.
describe('injected preload bundle', () => {
  test('is built as an IIFE', () => {
    const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['build:preload']).toContain('--format iife');
  });

  test('declares no globals on the page', () => {
    const bundle = readFileSync(join(root, 'src-tauri', 'inject', 'preload.js'), 'utf8');
    // `self !== top` keeps the bundle from starting its plugins; its
    // top-level declarations and install-time hooks still run.
    const window = { self: {}, top: {}, fetch: () => Promise.resolve(new Response()) };
    const sandbox = createContext({ window, location: { hostname: 'music.youtube.com' } });
    const before = new Set(Object.getOwnPropertyNames(sandbox));

    runInContext(bundle, sandbox);

    const added = Object.getOwnPropertyNames(sandbox).filter((name) => !before.has(name));
    expect(added).toEqual([]);
  });
});
