import { describe, expect, test } from 'bun:test';
import { pickLocale } from '../preload/ui/i18n';
import { unwrapBridgeResponse } from '../preload/bridgeClient';
import { downloadPhase, DownloadProgress } from '../plugins/downloader';
import { diffMembers } from '../plugins/sync-room';

describe('pickLocale follows the language YTM renders in', () => {
  test('Polish variants', () => {
    expect(pickLocale('pl').menuSync).toBe('Słuchaj razem');
    expect(pickLocale('pl-PL').menuSync).toBe('Słuchaj razem');
  });
  test('unknown or missing falls back to English', () => {
    expect(pickLocale('de-DE').menuSync).toBe('Listen together');
    expect(pickLocale('').menuSync).toBe('Listen together');
    expect(pickLocale(undefined).menuSync).toBe('Listen together');
  });
  test('Polish listener counts use the right plural form', () => {
    const pl = pickLocale('pl');
    expect(pl.syncListeners(1)).toBe('1 słuchacz');
    expect(pl.syncListeners(2)).toBe('2 słuchacze');
    expect(pl.syncListeners(5)).toBe('5 słuchaczy');
    expect(pl.syncListeners(12)).toBe('12 słuchaczy');
    expect(pl.syncListeners(22)).toBe('22 słuchacze');
  });
  test('every locale defines every string', () => {
    const en = pickLocale('en');
    const pl = pickLocale('pl');
    expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort());
  });
});

describe('bridge response contract', () => {
  test('ok responses resolve to their data', () => {
    expect(unwrapBridgeResponse('get_config', { ok: true, data: { a: 1 } })).toEqual({ a: 1 });
    expect(unwrapBridgeResponse('toggle_mini_player', { ok: true, data: null })).toBeNull();
    expect(unwrapBridgeResponse('toggle_mini_player', { ok: true })).toBeNull();
  });
  test('errors surface the backend message', () => {
    expect(() => unwrapBridgeResponse('save_config', { ok: false, error: 'bad field' })).toThrow('bad field');
    expect(() => unwrapBridgeResponse('save_config', { ok: false })).toThrow('save_config failed');
  });
  test('anything else is rejected, not treated as success', () => {
    expect(() => unwrapBridgeResponse('x', null)).toThrow();
    expect(() => unwrapBridgeResponse('x', { success: true })).toThrow();
  });
});

describe('download progress events', () => {
  const p = (over: Partial<DownloadProgress>): DownloadProgress => ({
    video_id: 'dQw4w9WgXcQ',
    title: 'T',
    percent: 50,
    status: '',
    output_path: null,
    error: null,
    ...over
  });
  test('classifies progress, completion and failure', () => {
    expect(downloadPhase(p({}))).toBe('progress');
    expect(downloadPhase(p({ percent: 100, output_path: '/m/a.mp3' }))).toBe('done');
    expect(downloadPhase(p({ error: 'yt-dlp is not installed' }))).toBe('failed');
    // A failure never reads as done, even at 100%.
    expect(downloadPhase(p({ percent: 100, output_path: '/m/a.mp3', error: 'x' }))).toBe('failed');
  });
});

describe('room member diff for join/leave toasts', () => {
  const m = (id: string, nickname = id) => ({ id, nickname, is_host: false });
  test('reports joins and leaves, never ourselves', () => {
    const prev = [m('me'), m('a', 'Ania')];
    const next = [m('me'), m('b', 'Bartek')];
    expect(diffMembers(prev, next, 'me')).toEqual({ joined: ['Bartek'], left: ['Ania'] });
    expect(diffMembers([], [m('me')], 'me')).toEqual({ joined: [], left: [] });
  });
});
