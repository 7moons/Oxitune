import { describe, expect, test } from 'bun:test';
import { mirrorManifest } from '../../scripts/update-manifest';

const release = {
  version: '0.3.0',
  notes: 'notes',
  pub_date: '2026-09-24T12:00:00Z',
  platforms: {
    'linux-x86_64': { signature: 'sigA', url: 'https://github.com/KayZedd/Oscilla/releases/download/v0.3.0/Oscilla_0.3.0_amd64.AppImage' },
    'linux-x86_64-appimage': { signature: 'sigA', url: 'https://github.com/KayZedd/Oscilla/releases/download/v0.3.0/Oscilla_0.3.0_amd64.AppImage' },
    'windows-x86_64': { signature: 'sigB', url: 'https://github.com/KayZedd/Oscilla/releases/download/v0.3.0/Oscilla_0.3.0_x64-setup.exe' },
    'windows-x86_64-msi': { signature: 'sigC', url: 'https://github.com/KayZedd/Oscilla/releases/download/v0.3.0/Oscilla_0.3.0_x64_en-US.msi' }
  }
};

describe('update manifest mirrored on Pages', () => {
  test('points every platform at the Pages copy and keeps the signatures', () => {
    const { manifest, files } = mirrorManifest(release, 'https://kayzedd.github.io/Oscilla/', 'v0.3.0');
    expect(manifest.platforms['windows-x86_64'].url).toBe('https://kayzedd.github.io/Oscilla/updates/v0.3.0/Oscilla_0.3.0_x64-setup.exe');
    expect(manifest.platforms['windows-x86_64'].signature).toBe('sigB');
    expect(manifest.version).toBe('0.3.0');
    expect(manifest.notes).toBe('notes');
    expect(files).toEqual(['Oscilla_0.3.0_amd64.AppImage', 'Oscilla_0.3.0_x64-setup.exe', 'Oscilla_0.3.0_x64_en-US.msi']);
  });

  test('refuses anything that could escape the updates folder or lacks a signature', () => {
    const bad = (url: string, signature = 's') => ({ ...release, platforms: { x: { url, signature } } });
    expect(() => mirrorManifest(bad('https://github.com/a/releases/download/v1/..%2F..%2Findex.html'), 'https://h/x', 'v1')).toThrow();
    expect(() => mirrorManifest(bad('https://github.com/a/releases/download/v1/.hidden'), 'https://h/x', 'v1')).toThrow();
    expect(() => mirrorManifest(bad('https://github.com/a/releases/download/v1/ok.exe', ''), 'https://h/x', 'v1')).toThrow();
    expect(() => mirrorManifest(release, 'http://h/x', 'v0.3.0')).toThrow();
    expect(() => mirrorManifest(release, 'https://h/x', '../v1')).toThrow();
  });
});
