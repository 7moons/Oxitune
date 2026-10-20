import { describe, expect, test } from 'bun:test';
import { shouldInhibitSleep } from '../plugins/power';

describe('Power: keep the system awake while playing', () => {
  test('inhibits only while playing', () => {
    expect(shouldInhibitSleep(true, true)).toBe(true);
    expect(shouldInhibitSleep(true, false)).toBe(false);
  });

  test('the setting defaults to on when missing', () => {
    expect(shouldInhibitSleep(undefined, true)).toBe(true);
  });

  test('turning the setting off stops inhibiting', () => {
    expect(shouldInhibitSleep(false, true)).toBe(false);
  });
});
