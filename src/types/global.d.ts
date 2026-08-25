export {};

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<any>;
      };
      event: {
        listen: <T = any>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
        emit: (event: string, payload?: unknown) => Promise<void>;
      };
    };
    __TAURI_INTERNALS__?: {
      invoke: (cmd: string, args?: Record<string, unknown>) => Promise<any>;
      postMessage: (message: any) => void;
    };
  }
}
