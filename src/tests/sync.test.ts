import { describe, expect, test } from 'bun:test';

describe('P2P Room Sync Suite', () => {
  test('validates room code format (YTMD-XXXX)', () => {
    const isValidRoomCode = (code: string) => /^YTMD-[A-Z0-9]{4,8}$/i.test(code.trim());

    expect(isValidRoomCode('YTMD-7842')).toBe(true);
    expect(isValidRoomCode('YTMD-ABC123')).toBe(true);
    expect(isValidRoomCode('ytmd-xyz9')).toBe(true);
    expect(isValidRoomCode('INVALID-CODE')).toBe(false);
    expect(isValidRoomCode('YTMD-')).toBe(false);
  });

  test('calculates clock drift and triggers compensation accurately', () => {
    const calculateDrift = (current: number, hostTime: number) => Math.abs(current - hostTime);
    const shouldSeek = (drift: number) => drift > 1.5;

    expect(shouldSeek(calculateDrift(10.0, 10.4))).toBe(false); // 0.4s drift -> acceptable
    expect(shouldSeek(calculateDrift(10.0, 11.2))).toBe(false); // 1.2s drift -> acceptable
    expect(shouldSeek(calculateDrift(10.0, 12.0))).toBe(true);  // 2.0s drift -> resync required
    expect(shouldSeek(calculateDrift(45.0, 30.0))).toBe(true);  // 15s desync -> resync required
  });

  test('computes target playback time with network latency offset', () => {
    const computeTargetTime = (
      hostCurrentTime: number,
      sentTimestampMs: number,
      receiveTimestampMs: number,
      isPlaying: boolean
    ) => {
      if (!isPlaying) return hostCurrentTime;
      const elapsedSeconds = Math.max(0, (receiveTimestampMs - sentTimestampMs) / 1000);
      return hostCurrentTime + elapsedSeconds;
    };

    const hostTime = 50.0;
    const sent = 1000;
    const received = 1250; // 250ms transit

    expect(computeTargetTime(hostTime, sent, received, true)).toBeCloseTo(50.25, 2);
    expect(computeTargetTime(hostTime, sent, received, false)).toBe(50.0); // paused
  });
});
