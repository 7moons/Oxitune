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
    changes = 0;
    private currentValue = 50;
    get value() { return this.currentValue; }
    set value(next: number) {
      this.currentValue = Math.round(Number(next) / this.step) * this.step;
    }
    // YTM's onVolumeChange: the slider value goes through a curve to the player.
    dispatchEvent(event: Event) {
      if (event.type === 'change') {
        this.changes++;
        player.setVolume(sliderToPlayer(this.currentValue));
      }
      return true;
    }
  }
  const sliderToPlayer = (value: number) => Math.round((value * value) / 100);

  const panel = new FakeElement();
  const artwork = new FakeElement();
  artwork.rect = { left: 400, right: 900, top: 200, bottom: 700, width: 500, height: 500 };
  const video = Object.assign(new FakeElement(), { volume: 0.25, muted: false });
  video.rect = { left: 300, right: 1000, top: 150, bottom: 650, width: 700, height: 500 };
  let frame: FakeElement | null = null;
  let mode: 'song' | 'video' = 'song';
  let fullscreen = false;
  let playerVolume = 25;
  const slider = new FakeSlider();
  const expandedSlider = new FakeSlider();
  let wheelHandler: ((event: WheelEvent) => void) | undefined;
  let intervalHandler: (() => void) | undefined;
  let nextTimerId = 1;
  const timers = new Map<number, () => void>();
  let nextFrameId = 1;
  const frames = new Map<number, () => void>();
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
      requestAnimationFrame: (handler: () => void) => {
        const id = nextFrameId++;
        frames.set(id, handler);
        return id;
      },
      cancelAnimationFrame: (id: number) => { frames.delete(id); }
    }
  });
  Object.defineProperty(globalThis, 'document', {
    configurable: true,
    value: {
      documentElement: { lang: 'pl' },
      body: { appendChild: (node: FakeElement) => { indicator = node; } },
      createElement: () => new FakeElement(),
      getElementById: (id: string) => {
        if (id === 'oxitune-kit-styles') return {};
        if (id === 'movie_player') return player;
        return null;
      },
      querySelector: (selector: string) => {
        if (selector === 'ytmusic-player-page #main-panel') return panel;
        if (selector === 'ytmusic-player-page #song-image') return artwork;
        if (selector === 'ytmusic-player-page video') return video;
        if (selector === 'ytmusic-player-page #player') return frame;
        if (selector === 'ytmusic-player-bar #volume-slider') return slider;
        if (selector === '#expand-volume-slider') return expandedSlider;
        if (selector === 'ytmusic-player-page[video-mode], ytmusic-player-page ytmusic-player[video-mode]') {
          return mode === 'video' ? panel : null;
        }
        if (selector === 'ytmusic-player-page[player-fullscreened]') return fullscreen ? panel : null;
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
      player.setVolume(sliderToPlayer(slider.value));
    },
    // The mismatch the old direct player writes left after a restart.
    setPlayerVolumeOnly(value: number) { player.setVolume(value); },
    get sliderChanges() { return slider.changes; },
    setWheelStep(value: number) { ctx.config.wheel_volume_step = value; },
    get indicator() { return indicator; },
    setMode(value: 'song' | 'video') { mode = value; },
    setFullscreen(value: boolean) { fullscreen = value; },
    // A wheel target inside an element with the given tag that matches the popup/dialog filter.
    targetInside(tagName: string) {
      const container = Object.assign(new FakeElement(), { tagName });
      return Object.assign(new FakeElement(), { closest: () => container });
    },
    dispatchInput() { documentHandlers.get('input')?.({} as Event); },
    // The user let go of YTM's own slider: YTM has set the player from it.
    releaseNativeSlider(value: number) {
      this.setSliderValue(value);
      const target = Object.assign(new FakeElement(), { closest: () => slider });
      documentHandlers.get('change')?.({ type: 'change', target } as unknown as Event);
    },
    get playerVolume() { return player.getVolume(); },
    tick() { intervalHandler?.(); },
    moveVideo(left: number, top: number) {
      video.rect = { ...video.rect, left, top, right: left + video.rect.width, bottom: top + video.rect.height };
    },
    setPlayerFrame(left: number, top: number, width: number, height: number) {
      frame = new FakeElement();
      frame.rect = { left, top, width, height, right: left + width, bottom: top + height };
    },
    get pendingFrames() { return frames.size; },
    frame() {
      const due = [...frames];
      frames.clear();
      for (const [, handler] of due) handler();
    },
    expireBadge() {
      for (const [id, handler] of timers) {
        timers.delete(id);
        handler();
      }
    },
    lastWheelStopped: false,
    wheelDown() {
      wheelHandler?.({
        deltaY: 100, ctrlKey: false, target: null, clientX: 100, clientY: 100,
        preventDefault: () => {}, stopPropagation: () => {}
      } as unknown as WheelEvent);
    },
    wheelUp(clientX = 100, clientY = 100, target: unknown = null) {
      let prevented = false;
      this.lastWheelStopped = false;
      wheelHandler?.({
        deltaY: -100,
        ctrlKey: false,
        target,
        clientX,
        clientY,
        preventDefault: () => { prevented = true; },
        stopPropagation: () => { this.lastWheelStopped = true; }
      } as unknown as WheelEvent);
      return prevented;
    }
  };
}

test('wheel volume keeps the native player volume control in sync', () => {
  const page = createPage();
  expect(page.wheelUp()).toBe(true);
  expect(page.sliderValue).toBe(55);
  expect(page.expandedSliderValue).toBe(55);
  // YTM turned the slider change into the player volume through its curve.
  expect(page.sliderChanges).toBe(1);
  expect(page.video.volume).toBe(0.3);
  expect(page.indicator?.textContent).toBe('55%');
});

test('steps count on the slider YTM shows, not the player volume behind its curve', () => {
  const page = createPage();
  page.setWheelStep(0.01);
  page.setSliderValue(40);
  page.setPlayerVolumeOnly(10);
  page.wheelUp();
  expect(page.sliderValue).toBe(41);
  expect(page.indicator?.textContent).toBe('41%');
  expect(page.video.volume).toBe(0.17);
});

test("a handled wheel never reaches YTM's own bigger-step volume scroll", () => {
  const page = createPage();
  page.setWheelStep(0.01);
  expect(page.wheelUp()).toBe(true);
  expect(page.lastWheelStopped).toBe(true);
  expect(page.sliderValue).toBe(51);

  // Not ours to handle (outside the bar and player page): left alone.
  expect(page.wheelUp(1200, 400)).toBe(false);
  expect(page.lastWheelStopped).toBe(false);
});

// Regression: YTM rounds its curved player volume to whole percent, so
// slider values 1-4 played nothing ("below 5% it's silent"), and skipping
// them (0 -> 5) made no sense either.
test('the lowest slider values play quietly instead of not at all', () => {
  const page = createPage();
  page.setWheelStep(0.01);
  page.wheelUp(); // our first change puts the slider on 1% steps
  page.setSliderValue(0);

  page.wheelUp();
  expect(page.sliderValue).toBe(1);
  expect(page.playerVolume).toBe(0);
  expect(page.video.volume).toBeCloseTo(0.002);
  expect(page.indicator?.textContent).toBe('1%');

  page.wheelUp();
  page.wheelUp();
  expect(page.sliderValue).toBe(3);
  expect(page.video.volume).toBeCloseTo(0.006);

  page.wheelDown();
  page.wheelDown();
  page.wheelDown();
  expect(page.sliderValue).toBe(0);
  expect(page.video.volume).toBe(0);
});

test("YTM's own slider and a new song keep a quiet value audible", () => {
  const page = createPage();
  page.releaseNativeSlider(5);
  page.setSliderValue(0);
  page.wheelUp(); // slider now on 1% steps
  page.releaseNativeSlider(2);
  page.frame();
  expect(page.video.volume).toBeCloseTo(0.004);

  // YTM applies its volume (0) to the next song's video.
  page.setPlayerVolumeOnly(0);
  page.tick();
  expect(page.video.volume).toBeCloseTo(0.004);
});

test('configured one-point steps are reflected exactly by both native sliders', () => {
  const page = createPage();
  page.setWheelStep(0.01);
  page.wheelUp();
  expect(page.sliderValue).toBe(51);
  expect(page.sliderValue).toBe(51);
  expect(page.expandedSliderValue).toBe(51);
  expect(page.indicator?.textContent).toBe('51%');
});

test('volume badge appears only after a change, follows media, then fades away', () => {
  const page = createPage();
  expect(page.indicator?.classes.has('oxitune-visible')).toBe(false);

  page.wheelUp();
  expect(page.indicator?.classes.has('oxitune-visible')).toBe(true);
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
  expect(page.indicator?.classes.has('oxitune-visible')).toBe(false);
  expect(KIT_CSS).toMatch(/#oxitune-volume-indicator\s*\{[^}]*transition:\s*opacity/s);
});

test('visible badge follows the media while the player page is still moving, then stops', () => {
  const page = createPage();
  page.setMode('video');
  page.moveVideo(300, -40);
  page.wheelUp();
  expect(page.indicator?.style.top).toBe('8px');

  page.moveVideo(300, 150);
  page.frame();
  expect(page.indicator?.style.left).toBe('312px');
  expect(page.indicator?.style.top).toBe('162px');
  expect(page.pendingFrames).toBe(1);

  page.expireBadge();
  expect(page.indicator?.classes.has('oxitune-visible')).toBe(false);
  expect(page.pendingFrames).toBe(0);
});

test('a paused video taller than its frame still gets the badge in the frame corner', () => {
  const page = createPage();
  page.setMode('video');
  page.setPlayerFrame(300, 290, 540, 300);
  page.moveVideo(300, -40);
  page.wheelUp();
  expect(page.indicator?.style.left).toBe('312px');
  expect(page.indicator?.style.top).toBe('302px');
});

test('fullscreen player changes volume anywhere on screen, not only over the old main panel', () => {
  const page = createPage();
  expect(page.wheelUp(1200, 400)).toBe(false);
  expect(page.sliderValue).toBe(50);

  page.setFullscreen(true);
  expect(page.wheelUp(1200, 400)).toBe(true);
  expect(page.sliderValue).toBe(55);
});

test('fullscreen player marked role=dialog still takes the wheel, real popups do not', () => {
  const page = createPage();
  page.setFullscreen(true);
  expect(page.wheelUp(600, 400, page.targetInside('YTMUSIC-PLAYER'))).toBe(true);
  expect(page.sliderValue).toBe(55);

  expect(page.wheelUp(600, 400, page.targetInside('TP-YT-PAPER-DIALOG'))).toBe(false);
  expect(page.sliderValue).toBe(55);
});
