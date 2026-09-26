import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { appendWhenRooted } from '../preload/pluginHost';

// Regression: the ad blocker (runAt document-start) adds its style before
// <html> exists; the host appended to `document.head || documentElement`,
// threw on null at every start, and the plugin was switched off for it.
describe('appendWhenRooted', () => {
  const g = globalThis as unknown as Record<string, unknown>;
  let savedObserver: unknown;
  let observers: { cb: () => void; disconnected: boolean }[];

  beforeEach(() => {
    savedObserver = g.MutationObserver;
    observers = [];
    g.MutationObserver = class {
      rec: { cb: () => void; disconnected: boolean };
      constructor(cb: () => void) {
        this.rec = { cb, disconnected: false };
        observers.push(this.rec);
      }
      observe() {}
      disconnect() {
        this.rec.disconnected = true;
      }
    };
  });
  afterEach(() => {
    g.MutationObserver = savedObserver;
  });

  const root = () => {
    const children: unknown[] = [];
    return { children, appendChild: (n: unknown) => children.push(n) };
  };
  const node = {} as Node;

  test('appends right away when the document has a root', () => {
    const head = root();
    appendWhenRooted(node, { head, documentElement: root() } as unknown as Document);
    expect(head.children).toEqual([node]);
    expect(observers).toHaveLength(0);
  });

  test('waits for <html> at document start, then appends once', () => {
    const doc = { head: null, documentElement: null } as unknown as { head: unknown; documentElement: unknown };
    appendWhenRooted(node, doc as unknown as Document); // no throw
    expect(observers).toHaveLength(1);

    observers[0].cb(); // a mutation, still no root
    expect(observers[0].disconnected).toBe(false);

    const html = root();
    doc.documentElement = html;
    observers[0].cb();
    expect(html.children).toEqual([node]);
    expect(observers[0].disconnected).toBe(true);
  });

  test('a style removed before the root appears never gets added', () => {
    const doc = { head: null, documentElement: null } as unknown as { head: unknown; documentElement: unknown };
    const cancel = appendWhenRooted(node, doc as unknown as Document);
    cancel();
    expect(observers[0].disconnected).toBe(true);
  });
});
