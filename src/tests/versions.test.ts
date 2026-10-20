import { describe, expect, test } from 'bun:test';
import { readVersions } from '../../scripts/versions';

describe('app version', () => {
  test('package.json, Cargo.toml and tauri.conf.json agree', () => {
    const v = readVersions();
    expect(v.cargo).toBe(v.package);
    expect(v.tauri).toBe(v.package);
  });
});
