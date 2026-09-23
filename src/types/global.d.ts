export {};

declare global {
  interface Window {
    __TAURI__?: {
      core: {
        invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
        /** Local file path -> URL the webview can load (asset protocol; differs per OS). */
        convertFileSrc: (filePath: string, protocol?: string) => string;
      };
      event: {
        listen: <T = unknown>(event: string, handler: (event: { payload: T }) => void) => Promise<() => void>;
        emit: (event: string, payload?: unknown) => Promise<void>;
      };
      window?: {
        getCurrentWindow: () => {
          setAlwaysOnTop: (alwaysOnTop: boolean) => Promise<void>;
        };
      };
    };
    __ytmd_show_remote_qr?: () => void;
  }
}
