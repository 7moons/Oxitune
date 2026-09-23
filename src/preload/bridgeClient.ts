/**
 * Client side of the injected-page IPC bridge (the `ytmd-invoke` event
 * handled in src-tauri/src/lib.rs). The main window loads an external
 * origin, so it can't call `#[tauri::command]`s directly.
 */

export interface BridgeResponse {
  ok: boolean;
  data?: unknown;
  error?: string;
}

/** Unwraps a `ytmd-response-{id}` payload per the bridge contract in
 * lib.rs: `{ ok: true, data }` resolves to `data`, `{ ok: false, error }`
 * throws, so callers see backend failures instead of a silent `null`. */
export function unwrapBridgeResponse(cmd: string, payload: unknown): unknown {
  if (!payload || typeof payload !== 'object' || !('ok' in payload)) {
    throw new Error(`Malformed response to ${cmd}`);
  }
  const res = payload as BridgeResponse;
  if (!res.ok) throw new Error(res.error || `${cmd} failed`);
  return res.data ?? null;
}

const DEFAULT_BRIDGE_TIMEOUT_MS = 8000;

export const invokeBackend = (
  cmd: string,
  args: Record<string, unknown> = {},
  opts: { timeoutMs?: number } = {}
): Promise<unknown> => {
  return new Promise((resolve, reject) => {
    const tauri = window.__TAURI__;
    if (!tauri?.event?.emit) {
      reject(new Error('Tauri bridge unavailable'));
      return;
    }

    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    let unlisten: (() => void) | null = null;

    const timer = setTimeout(() => {
      if (unlisten) unlisten();
      reject(new Error(`Timed out waiting for ${cmd}`));
    }, opts.timeoutMs ?? DEFAULT_BRIDGE_TIMEOUT_MS);

    tauri.event
      .listen(`ytmd-response-${id}`, (event) => {
        clearTimeout(timer);
        if (unlisten) unlisten();
        try {
          resolve(unwrapBridgeResponse(cmd, event.payload));
        } catch (e) {
          reject(e);
        }
      })
      .then((unlistenFn) => {
        unlisten = unlistenFn;
        return tauri.event.emit('ytmd-invoke', { id, cmd, args });
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      });
  });
};

