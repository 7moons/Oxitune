/**
 * Global shortcuts as Settings records and shows them. The stored form is
 * the accelerator string the backend registers (`src-tauri/src/shortcuts.rs`,
 * parsed by tauri-plugin-global-shortcut): modifiers and a
 * `KeyboardEvent.code`, e.g. `Control+Alt+KeyL` or `MediaPlayPause`.
 */

/** Player actions with a shortcut, in display order (`ACTIONS` in
 * shortcuts.rs). */
export const SHORTCUT_ACTIONS = ['play_pause', 'next', 'previous', 'like', 'dislike', 'mute'] as const;
export type ShortcutAction = (typeof SHORTCUT_ACTIONS)[number];

const MODIFIER_CODES = new Set([
  'ControlLeft',
  'ControlRight',
  'AltLeft',
  'AltRight',
  'ShiftLeft',
  'ShiftRight',
  'MetaLeft',
  'MetaRight',
  'OSLeft',
  'OSRight'
]);

export type KeyPress = Pick<KeyboardEvent, 'code' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey'>;

/** The accelerator for a key press while recording, or `null` while only
 * modifiers are held (the user is still building the combination). */
export function acceleratorFromEvent(e: KeyPress): string | null {
  if (!e.code || MODIFIER_CODES.has(e.code)) return null;
  const parts: string[] = [];
  if (e.ctrlKey) parts.push('Control');
  if (e.altKey) parts.push('Alt');
  if (e.shiftKey) parts.push('Shift');
  if (e.metaKey) parts.push('Super');
  parts.push(e.code);
  return parts.join('+');
}

const MODIFIER_LABEL: Record<string, string> = {
  Control: 'Ctrl',
  CommandOrControl: 'Ctrl',
  Alt: 'Alt',
  Shift: 'Shift',
  Super: 'Win'
};

const KEY_LABEL: Record<string, string> = {
  ArrowUp: '↑',
  ArrowDown: '↓',
  ArrowLeft: '←',
  ArrowRight: '→',
  Space: 'Space',
  Comma: ',',
  Period: '.',
  Slash: '/',
  Semicolon: ';',
  Quote: "'",
  BracketLeft: '[',
  BracketRight: ']',
  Backslash: '\\',
  Minus: '-',
  Equal: '=',
  Backquote: '`'
};

/** Readable form: `Control+Alt+KeyL` → `Ctrl + Alt + L`. Media keys come
 * back as their code; Settings translates those (`mediaKeyLabel`). */
export function formatAccelerator(accelerator: string): string {
  return accelerator
    .split('+')
    .map((part) => {
      if (MODIFIER_LABEL[part]) return MODIFIER_LABEL[part];
      if (KEY_LABEL[part]) return KEY_LABEL[part];
      const letter = /^Key([A-Z])$/.exec(part);
      if (letter) return letter[1];
      const digit = /^(?:Digit|Numpad)(\d)$/.exec(part);
      if (digit) return digit[1];
      return part;
    })
    .join(' + ');
}

export function isMediaKey(accelerator: string): boolean {
  return /^(Media|AudioVolume)/.test(accelerator);
}
