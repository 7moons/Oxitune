/**
 * The welcome window's choices, kept apart from its DOM (welcome.ts) so
 * they can be tested: which config fields each step offers, and what a
 * missing field means (matches AppConfig::default() in config.rs).
 */

export type WelcomeConfig = Record<string, unknown>;

export const WELCOME_STEPS = ['intro', 'desktop', 'sound', 'network', 'done'] as const;
export type WelcomeStep = (typeof WELCOME_STEPS)[number];

/** Checkbox ids in welcome.html, each a boolean AppConfig field. */
export const WELCOME_TOGGLES: [field: string, fallback: boolean][] = [
  ['discord_rpc_enabled', true],
  ['autostart', false],
  ['close_to_tray', true],
  ['notifications_enabled', false],
  ['pause_on_lock', true],
  ['lyrics_enabled', true],
  ['lyrics_auto_open', false],
  ['ambient_lighting_enabled', true],
  ['loudness_normalization', false],
  ['lyrics_translate_enabled', false],
  ['lyrics_romanize_enabled', false],
  ['remote_enabled', false]
];

/** The value a toggle shows for `config`. */
export function toggleValue(config: WelcomeConfig, field: string): boolean {
  const entry = WELCOME_TOGGLES.find(([f]) => f === field);
  if (!entry) throw new Error(`not a welcome toggle: ${field}`);
  return typeof config[field] === 'boolean' ? (config[field] as boolean) : entry[1];
}

/** `config` with the toggles in `choices` applied; every other field
 * (paths, equalizer, shortcuts, ...) round-trips untouched. */
export function applyChoices(config: WelcomeConfig, choices: Record<string, boolean>): WelcomeConfig {
  const next = { ...config };
  for (const [field] of WELCOME_TOGGLES) {
    if (typeof choices[field] === 'boolean') next[field] = choices[field];
  }
  return next;
}

/** The step index after moving by `delta`, kept inside the wizard. */
export function moveStep(index: number, delta: number): number {
  return Math.min(WELCOME_STEPS.length - 1, Math.max(0, index + delta));
}
