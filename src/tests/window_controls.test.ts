import { afterEach, expect, test } from 'bun:test';
import { isDragTarget } from '../preload/ui/windowControls';

const original = Object.getOwnPropertyDescriptor(globalThis, 'Element');

afterEach(() => {
  if (original) Object.defineProperty(globalThis, 'Element', original);
  else Reflect.deleteProperty(globalThis, 'Element');
});

// An element whose ancestors (itself first) are the given selectors' matches.
function elementIn(...ancestors: string[]) {
  class FakeElement {
    closest(selector: string) {
      const wanted = selector.split(',').map((s) => s.trim());
      return ancestors.some((a) => wanted.includes(a)) ? this : null;
    }
  }
  Object.defineProperty(globalThis, 'Element', { configurable: true, value: FakeElement });
  return new FakeElement() as unknown as EventTarget;
}

test('empty nav bar space drags the window', () => {
  expect(isDragTarget(elementIn('ytmusic-nav-bar'))).toBe(true);
  expect(isDragTarget(elementIn('#nav-bar-background'))).toBe(true);
});

test('nav bar controls keep their clicks', () => {
  for (const control of ['ytmusic-search-box', 'a', 'button', 'ytmusic-settings-button', '#oxitune-window-controls', '#oxitune-nav-slot']) {
    expect(isDragTarget(elementIn(control, 'ytmusic-nav-bar'))).toBe(false);
  }
});

test('nothing outside the nav bar drags the window', () => {
  expect(isDragTarget(elementIn('ytmusic-player-bar'))).toBe(false);
  expect(isDragTarget(null)).toBe(false);
});
