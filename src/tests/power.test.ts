import { describe, expect, test } from 'bun:test';
import { shouldPauseOnLock } from '../plugins/power';

describe('Power: pause-on-lock decision logic', () => {
  test('pauses when the screen locks/hides while playing and the feature is enabled', () => {
    expect(shouldPauseOnLock(true, true, false)).toBe(true);
  });

  test('does nothing if the feature is disabled', () => {
    expect(shouldPauseOnLock(true, false, false)).toBe(false);
  });

  test('does nothing if the tab/screen is not actually hidden', () => {
    expect(shouldPauseOnLock(false, true, false)).toBe(false);
  });

  test('does not re-pause a video that is already paused', () => {
    expect(shouldPauseOnLock(true, true, true)).toBe(false);
  });
});
