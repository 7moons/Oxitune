export {};

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
        /** Local file path -> URL the webview can load (asset protocol; differs per OS). */
        convertFileSrc: (filePath: string, protocol?: string) => string;
        /** A Tauri IPC channel: pass it as a command argument, receive on `onmessage`. */
        Channel: new <T = unknown>() => { onmessage: (message: T) => void };
      };
      event: {
        listen: <T = unknown>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
        emit: (event: string, payload?: unknown) => Promise<void>;
      };
      window?: {
        getCurrentWindow: () => {
          setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
          minimize: () => Promise<void>;
          toggleMaximize: () => Promise<void>;
          isMaximized: () => Promise<boolean>;
          close: () => Promise<void>;
          startDragging: () => Promise<void>;
          onResized: (handler: () => void) => Promise<() => void>;
        };
      };
    };
  }
}
