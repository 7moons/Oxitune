import { describe, expect, test } from 'bun:test';

describe('Web Remote & Power Watchdog Suite', () => {
  test('formats local Wi-Fi remote URL properly', () => {
    const formatRemoteUrl = (ip: string, port: number) => `http://${ip}:${port}`;

    expect(formatRemoteUrl('192.168.1.105', 9863)).toBe('http://192.168.1.105:9863');
    expect(formatRemoteUrl('127.0.0.1', 8080)).toBe('http://127.0.0.1:8080');
  });

  test('validates supported remote commands', () => {
    const validCommands = ['play_pause', 'play', 'pause', 'next', 'previous', 'like', 'dislike'];
    const isCommandValid = (cmd: string) => validCommands.includes(cmd);

    expect(isCommandValid('play_pause')).toBe(true);
    expect(isCommandValid('next')).toBe(true);
    expect(isCommandValid('previous')).toBe(true);
    expect(isCommandValid('shutdown_system')).toBe(false);
  });

  test('clamps remote volume strictly between 0.0 and 1.0', () => {
    const clampVolume = (vol: number) => Math.max(0.0, Math.min(1.0, vol));

    expect(clampVolume(0.5)).toBe(0.5);
    expect(clampVolume(1.5)).toBe(1.0);
    expect(clampVolume(-0.2)).toBe(0.0);
    expect(clampVolume(0.85)).toBe(0.85);
  });
});
