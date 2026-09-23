/**
 * Equalizer presets the user saves in Settings, stored in
 * `AppConfig::equalizer_custom_presets` (config.rs sanitizes them again on
 * save: ids, name length, 10 gains in range).
 */

export interface CustomEqPreset {
  id: string;
  name: string;
  gains: number[];
  preamp: number;
}

export const MAX_CUSTOM_PRESETS = 30;
export const MAX_PRESET_NAME_CHARS = 40;

export function isCustomPresetId(id: string): boolean {
  return /^user-[a-z0-9]{1,16}$/.test(id);
}

/** A new preset id the backend accepts: `user-` + lowercase letters/digits,
 * not one of `existing`. */
export function newPresetId(now: number, existing: readonly string[]): string {
  const base = now.toString(36).slice(-12);
  let id = `user-${base}`;
  for (let n = 1; existing.includes(id); n++) id = `user-${base}${n.toString(36)}`;
  return id;
}

/** Saves a curve under `name`: replaces the preset with that name (any
 * case), otherwise adds one. `null` for an empty name or at the limit. */
export function savePreset(
  presets: CustomEqPreset[],
  name: string,
  gains: number[],
  preamp: number,
  now = Date.now()
): { presets: CustomEqPreset[]; id: string } | null {
  const clean = name.trim().slice(0, MAX_PRESET_NAME_CHARS);
  if (!clean) return null;
  const existing = presets.find((p) => p.name.toLocaleLowerCase() === clean.toLocaleLowerCase());
  if (existing) {
    return {
      presets: presets.map((p) => (p.id === existing.id ? { ...p, name: clean, gains: [...gains], preamp } : p)),
      id: existing.id
    };
  }
  if (presets.length >= MAX_CUSTOM_PRESETS) return null;
  const id = newPresetId(
    now,
    presets.map((p) => p.id)
  );
  return { presets: [...presets, { id, name: clean, gains: [...gains], preamp }], id };
}

export function deletePreset(presets: CustomEqPreset[], id: string): CustomEqPreset[] {
  return presets.filter((p) => p.id !== id);
}
