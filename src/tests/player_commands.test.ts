import { describe, expect, test } from 'bun:test';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

// Regression: MPRIS/SMTC "Toggle" and the tray's Play/Pause sent
// "play-pause", which handlePlayerCommand doesn't know, so they did nothing.
describe('player commands sent by the backend', () => {
  const root = join(import.meta.dir, '..', '..');
  const page = readFileSync(join(root, 'src/preload/index.ts'), 'utf8');
  const handled = new Set(
    [...page.slice(page.indexOf('function handlePlayerCommand')).matchAll(/case '([a-z_]+)':/g)].map((m) => m[1])
  );

  test('every command Rust emits is one the page handles', () => {
    const dir = join(root, 'src-tauri/src');
    const sent: string[] = [];
    for (const file of readdirSync(dir).filter((f) => f.endsWith('.rs'))) {
      const src = readFileSync(join(dir, file), 'utf8');
      for (const m of src.matchAll(/emit\("(?:mpris-command|tray-command|player-command)",\s*"([^"]+)"\)/g)) sent.push(m[1]);
    }
    expect(handled.size).toBeGreaterThan(5);
    expect(sent.length).toBeGreaterThan(5);
    expect(sent.filter((c) => !handled.has(c))).toEqual([]);
  });
});
