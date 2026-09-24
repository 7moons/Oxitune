/**
 * The injected page's link to the backend. The main window shows the
 * external music.youtube.com origin, whose capability (capabilities/main.json)
 * allows exactly two commands:
 *
 * - `ytmd_bridge { cmd, args }` for requests (the table in bridge.rs), and
 * - `ytmd_subscribe { channel }` for the app events the page reacts to
 *   (page_ipc.rs relays `PAGE_EVENTS`; the page cannot emit or listen to
 *   Tauri events itself).
 */

const DEFAULT_BRIDGE_TIMEOUT_MS = 8000;

export const invokeBackend = (
  cmd: string,
  args: Record<string, unknown> = {},
  opts: { timeoutMs?: number } = {}
): Promise<unknown> => {
  const core = window.__TAURI__?.core;
  if (!core?.invoke) return Promise.reject(new Error('Tauri bridge unavailable'));
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timed out waiting for ${cmd}`)),
      opts.timeoutMs ?? DEFAULT_BRIDGE_TIMEOUT_MS
    );
    core.invoke('ytmd_bridge', { cmd, args }).then(
      (data) => {
        clearTimeout(timer);
        resolve(data ?? null);
      },
      (e: unknown) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    );
  });
};

type Handler = (event: { payload: unknown }) => void;
const handlers = new Map<string, Set<Handler>>();
let subscribed = false;

function subscribe(): void {
  if (subscribed) return;
  const core = window.__TAURI__?.core;
  if (!core?.Channel || !core.invoke) return;
  subscribed = true;
  const channel = new core.Channel<{ event: string; payload: unknown }>();
  channel.onmessage = (msg) => {
    const set = handlers.get(msg?.event);
    if (!set) return;
    for (const handler of [...set]) {
      try {
        handler({ payload: msg.payload });
      } catch (e) {
        console.error(`[YTMD] ${msg.event} handler failed:`, e);
      }
    }
  };
  core.invoke('ytmd_subscribe', { channel }).catch((e: unknown) => {
    subscribed = false;
    console.error('[YTMD] Event feed unavailable:', e);
  });
}

/** Same shape as Tauri's `event.listen`, fed by the page's event channel. */
export const pageEvents = {
  listen<T = unknown>(event: string, handler: (event: { payload: T }) => void): Promise<() => void> {
    subscribe();
    const h = handler as Handler;
    let set = handlers.get(event);
    if (!set) handlers.set(event, (set = new Set()));
    set.add(h);
    return Promise.resolve(() => {
      handlers.get(event)?.delete(h);
    });
  }
};
