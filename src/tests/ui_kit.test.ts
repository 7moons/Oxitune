import { describe, expect, test } from 'bun:test';
import { pickLocale } from '../preload/ui/i18n';
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

describe('room member diff for join/leave toasts', () => {
  const m = (id: string, nickname = id) => ({ id, nickname, is_host: false });
  test('reports joins and leaves, never ourselves', () => {
    const prev = [m('me'), m('a', 'Ania')];
    const next = [m('me'), m('b', 'Bartek')];
    expect(diffMembers(prev, next, 'me')).toEqual({ joined: ['Bartek'], left: ['Ania'] });
    expect(diffMembers([], [m('me')], 'me')).toEqual({ joined: [], left: [] });
  });
});
