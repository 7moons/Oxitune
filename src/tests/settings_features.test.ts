import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';
import { join } from 'path';
import { acceleratorFromEvent, formatAccelerator, isMediaKey, SHORTCUT_ACTIONS } from '../ui/shortcuts';
import { deletePreset, isCustomPresetId, MAX_CUSTOM_PRESETS, newPresetId, savePreset } from '../ui/eqPresets';
import { dropIndex } from '../preload/ui/reorder';

const root = join(import.meta.dir, '..', '..');
const key = (code: string, mods: Partial<Record<'ctrlKey' | 'altKey' | 'shiftKey' | 'metaKey', boolean>> = {}) => ({
  code,
  ctrlKey: false,
  altKey: false,
  shiftKey: false,
  metaKey: false,
  ...mods
});

describe('recording global shortcuts', () => {
  test('a key press becomes an accelerator the backend parses', () => {
    expect(acceleratorFromEvent(key('KeyL', { ctrlKey: true, altKey: true }))).toBe('Control+Alt+KeyL');
    expect(acceleratorFromEvent(key('ArrowRight', { shiftKey: true, metaKey: true }))).toBe('Shift+Super+ArrowRight');
    expect(acceleratorFromEvent(key('F8'))).toBe('F8');
    expect(acceleratorFromEvent(key('MediaPlayPause'))).toBe('MediaPlayPause');
  });

  test('modifiers alone are still being pressed, not a shortcut', () => {
    expect(acceleratorFromEvent(key('ControlLeft', { ctrlKey: true }))).toBeNull();
    expect(acceleratorFromEvent(key('ShiftRight', { shiftKey: true, ctrlKey: true }))).toBeNull();
    expect(acceleratorFromEvent(key(''))).toBeNull();
  });

  test('shown the way people write them', () => {
    expect(formatAccelerator('Control+Alt+KeyL')).toBe('Ctrl + Alt + L');
    expect(formatAccelerator('Shift+Super+ArrowRight')).toBe('Shift + Win + →');
    expect(formatAccelerator('Control+Digit5')).toBe('Ctrl + 5');
    expect(isMediaKey('MediaTrackNext')).toBe(true);
    expect(isMediaKey('Control+KeyM')).toBe(false);
  });

  test('the actions are the backend’s, in the same order', () => {
    const rust = readFileSync(join(root, 'src-tauri/src/shortcuts.rs'), 'utf8');
    const table = rust.slice(rust.indexOf('pub const ACTIONS'), rust.indexOf('];', rust.indexOf('pub const ACTIONS')));
    const actions = [...table.matchAll(/\("([a-z_]+)",/g)].map((m) => m[1]);
    expect(actions).toEqual([...SHORTCUT_ACTIONS]);
  });
});

describe('dragging queue rows', () => {
  // Four rows, 56px tall, starting at y=0: midpoints 28, 84, 140, 196.
  const mids = [28, 84, 140, 196];

  test('the drop index is where the row ends up after the move', () => {
    expect(dropIndex(10, mids, 3)).toBe(0); // last row dragged to the top
    expect(dropIndex(100, mids, 0)).toBe(1); // first row past the second
    expect(dropIndex(300, mids, 0)).toBe(3); // below everything: last
    expect(dropIndex(90, mids, 1)).toBe(1); // over its own place: no move
  });
});

describe('custom equalizer presets', () => {
  const gains = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  test('saving adds a preset with an id the backend keeps', () => {
    const saved = savePreset([], '  Moje słuchawki ', gains, -2, 1_700_000_000_000);
    expect(saved).not.toBeNull();
    expect(saved!.presets).toEqual([{ id: saved!.id, name: 'Moje słuchawki', gains, preamp: -2 }]);
    expect(isCustomPresetId(saved!.id)).toBe(true);
    // Same rule as `is_custom_preset_id` in config.rs.
    expect(readFileSync(join(root, 'src-tauri/src/config.rs'), 'utf8')).toContain('(1..=16).contains(&rest.len())');
  });

  test('saving under an existing name (any case) updates that preset', () => {
    const first = savePreset([], 'Bas', gains, 0, 1)!;
    const again = savePreset(first.presets, 'BAS', [0, 0, 0, 0, 0, 0, 0, 0, 0, 1], 3, 2)!;
    expect(again.id).toBe(first.id);
    expect(again.presets).toHaveLength(1);
    expect(again.presets[0].gains[9]).toBe(1);
    expect(again.presets[0].preamp).toBe(3);
  });

  test('ids never collide, even saved in the same millisecond', () => {
    const a = newPresetId(5, []);
    const b = newPresetId(5, [a]);
    expect(a).not.toBe(b);
    expect(isCustomPresetId(b)).toBe(true);
    expect(isCustomPresetId('flat')).toBe(false);
  });

  test('no name, or the limit reached, saves nothing', () => {
    expect(savePreset([], '   ', gains, 0)).toBeNull();
    const full = Array.from({ length: MAX_CUSTOM_PRESETS }, (_, i) => ({ id: `user-${i}`, name: `p${i}`, gains, preamp: 0 }));
    expect(savePreset(full, 'one more', gains, 0)).toBeNull();
    expect(savePreset(full, 'P3', gains, 1)?.id).toBe('user-3'); // updating is still fine
  });

  test('deleting', () => {
    const saved = savePreset([], 'A', gains, 0, 1)!;
    expect(deletePreset(saved.presets, saved.id)).toEqual([]);
  });
});
