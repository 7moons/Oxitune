import { afterEach, expect, test } from 'bun:test';
import { VolumePlugin } from '../plugins/volume';
import { PluginContext } from '../plugins/types';
import { scopedContext } from '../plugins/registry';
import { KIT_CSS } from '../preload/ui/kit';

const globals = ['window', 'document', 'Element', 'getComputedStyle'] as const;
const originals = globals.map((name) => Object.getOwnPropertyDescriptor(globalThis, name));

afterEach(() => {
  VolumePlugin.onDestroy?.();
  globals.forEach((name, index) => {
    const descriptor = originals[index];
    if (descriptor) Object.defineProperty(globalThis, name, descriptor);
    else Reflect.deleteProperty(globalThis, name);
  });
});

function createPage() {
  class FakeElement {
    id = '';
    textContent = '';
    parentElement: FakeElement | null = null;
    style = { left: '', top: '' };
    classes = new Set<string>();
    classList = {
      add: (name: string) => this.classes.add(name),
      remove: (name: string) => this.classes.delete(name),
      contains: (name: string) => this.classes.has(name)
    };
    rect = { left: 0, right: 600, top: 0, bottom: 600, width: 600, height: 600 };
    listeners = new Map<string, (event: Event) => void>();
    getBoundingClientRect() { return this.rect; }
    setAttribute(_name: string, _value: string) {}
    addEventListener(name: string, handler: (event: Event) => void) { this.listeners.set(name, handler); }
    removeEventListener(name: string) { this.listeners.delete(name); }
    remove() {}
  }

  class FakeSlider extends FakeElement {
    step = 5;
    private currentValue = 50;
    get value() { return this.currentValue; }
    set value(next: number) {
      this.currentValue = Math.round(Number(next) / this.step) * this.step;
    }
  }

  const panel = new FakeElement();
  const artwork = new FakeElement();
  artwork.rect = { left: 400, right: 900, top: 200, bottom: 700, width: 500, height: 500 };
  const video = Object.assign(new FakeElement(), { volume: 0.5, muted: false });
  video.rect = { left: 300, right: 1000, top: 150, bottom: 650, width: 700, height: 500 };
  let mode: 'song' | 'video' = 'song';
  let playerVolume = 50;
  const slider = new FakeSlider();
  const expandedSlider = new FakeSlider();
  let wheelHandler: ((event: WheelEvent) => void) | undefined;
  let intervalHandler: (() => void) | undefined;
  let nextTimerId = 1;
  const timers = new Map<number, () => void>();
  const documentHandlers = new Map<string, (event: Event) => void>();
  let indicator: FakeElement | null = null;

  const player = {
    getVolume: () => playerVolume,
    setVolume: (percent: number) => {
      playerVolume = percent;
      video.volume = percent / 100;
    },
    isMuted: () => false
  };
  Object.defineProperty(globalThis, 'Element', { configurable: true, value: FakeElement });
  Object.defineProperty(globalThis, 'getComputedStyle', {
    configurable: true,
    value: () => ({ display: 'block', visibility: 'visible', opacity: '1' })
  });
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      innerWidth: 1600,
      innerHeight: 900,
      addEventListener: (event: string, handler: (event: WheelEvent) => void) => {
        if (event === 'wheel') wheelHandler = handler;
      },
      removeEventListener: () => {},
      setInterval: (handler: () => void) => { intervalHandler = handler; return 1; },
      clearInterval: () => {},
      setTimeout: (handler: () => void) => {
        const id = nextTimerId++;
        timers.set(id, handler);
        return id;
      },
      clearTimeout: (id: number) => { timers.delete(id); },
      requestAnimationFrame: (handler: () => void) => { handler(); return 1; }
    }
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      documentElement: { lang: 'pl' },
      body: { appendChild: (node: FakeElement) => { indicator = node; } },
      createElement: () => new FakeElement(),
      getElementById: (id: string) => {
        if (id === 'ytmd-kit-styles') return {};
        if (id === 'movie_player') return player;
        return null;
      },
      querySelector: (selector: string) => {
        if (selector === 'ytmusic-player-page #main-panel') return panel;
        if (selector === 'ytmusic-player-page #song-image') return artwork;
        if (selector === 'ytmusic-player-page video') return video;
        if (selector === 'ytmusic-player-bar #volume-slider') return slider;
        if (selector === '#expand-volume-slider') return expandedSlider;
        if (selector === 'ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]') {
          return mode === 'video' ? panel : null;
        }
        return null;
      },
      addEventListener: (name: string, handler: (event: Event) => void) => documentHandlers.set(name, handler),
      removeEventListener: (name: string) => documentHandlers.delete(name)
    }
  });

  const ctx: PluginContext = scopedContext(
    {
      track: null,
      config: { wheel_volume_on_player_page: true, wheel_volume_step: 0.05 },
      invoke: async () => null,
      sendPlayerCommand: () => {},
      getVideoElement: () => video as unknown as HTMLVideoElement,
      listen: async () => () => {}
    },
    VolumePlugin.manifest
  );
  VolumePlugin.onInit?.(ctx);

  return {
    video,
    get sliderValue() { return slider.value; },
    get expandedSliderValue() { return expandedSlider.value; },
    setSliderValue(value: number) {
      slider.value = value;
      playerVolume = slider.value;
      video.volume = playerVolume / 100;
    },
    setWheelStep(value: number) { ctx.config.wheel_volume_step = value; },
    get indicator() { return indicator; },
    setMode(value: 'song' | 'video') { mode = value; },
    dispatchInput() { documentHandlers.get('input')?.({} as Event); },
    tick() { intervalHandler?.(); },
    expireBadge() {
      for (const [id, handler] of timers) {
        timers.delete(id);
        handler();
      }
    },
    wheelUp() {
      let prevented = false;
      wheelHandler?.({
        deltaY: -100,
        ctrlKey: false,
        target: null,
        clientX: 100,
        clientY: 100,
        preventDefault: () => { prevented = true; }
      } as WheelEvent);
      return prevented;
    }
  };
}

test('wheel volume keeps the native player volume control in sync', () => {
  const page = createPage();
  expect(page.wheelUp()).toBe(true);
  expect(page.sliderValue).toBe(55);
  expect(page.expandedSliderValue).toBe(55);
  expect(page.video.volume).toBe(0.55);
  expect(page.indicator?.textContent).toBe('55%');
});

test('configured one-point steps are reflected exactly by both native sliders', () => {
  const page = createPage();
  page.setWheelStep(0.01);
  page.wheelUp();
  expect(page.video.volume).toBe(0.51);
  expect(page.sliderValue).toBe(51);
  expect(page.expandedSliderValue).toBe(51);
  expect(page.indicator?.textContent).toBe('51%');
});

test('volume badge appears only after a change, follows media, then fades away', () => {
  const page = createPage();
  expect(page.indicator?.classes.has('ytmd-visible')).toBe(false);

  page.wheelUp();
  expect(page.indicator?.classes.has('ytmd-visible')).toBe(true);
  expect(page.indicator?.style.left).toBe('412px');
  expect(page.indicator?.style.top).toBe('212px');

  page.setMode('video');
  page.setSliderValue(35);
  page.dispatchInput();
  page.tick();
  expect(page.indicator?.textContent).toBe('35%');
  expect(page.indicator?.style.left).toBe('312px');
  expect(page.indicator?.style.top).toBe('162px');
  page.expireBadge();
  expect(page.indicator?.classes.has('ytmd-visible')).toBe(false);
  expect(KIT_CSS).toMatch(/#ytmd-volume-indicator\s*\{[^}]*transition:\s*opacity/s);
});
