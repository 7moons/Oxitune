/**
 * Settings → Lyrics sources: the provider priority list
 * (`AppConfig::lyrics_providers`), each with an on/off toggle and up/down
 * buttons. The backend sanitizes the list again on save.
 */
import { COMPANION_LOCALES, I18nKey, tr } from './i18n';

export interface ProviderSetting {
  id: string;
  enabled: boolean;
}

export const LYRICS_PROVIDER_IDS = ['local', 'lrcred', 'lrclib', 'unison', 'musixmatch', 'netease', 'ytm', 'genius'] as const;
/** Unofficial APIs, off unless the user turns them on. */
export const UNOFFICIAL_PROVIDERS = new Set(['unison', 'musixmatch', 'netease']);

/** Known ids once each, in the given order; a missing one (added in a
 * newer version) goes where the default order has it, right after the
 * nearest provider before it that the list has (mirrors
 * `sanitize_provider_settings` in Rust). */
export function normalizeProviders(list: ProviderSetting[] | undefined): ProviderSetting[] {
  const out: ProviderSetting[] = [];
  for (const p of list ?? []) {
    if ((LYRICS_PROVIDER_IDS as readonly string[]).includes(p.id) && !out.some((o) => o.id === p.id)) {
      out.push({ id: p.id, enabled: !!p.enabled });
    }
  }
  LYRICS_PROVIDER_IDS.forEach((id, i) => {
    if (out.some((o) => o.id === id)) return;
    let at = 0;
    for (let before = i - 1; before >= 0; before--) {
      const pos = out.findIndex((o) => o.id === LYRICS_PROVIDER_IDS[before]);
      if (pos >= 0) {
        at = pos + 1;
        break;
      }
    }
    out.splice(at, 0, { id, enabled: !UNOFFICIAL_PROVIDERS.has(id) });
  });
  return out;
}

/** A copy with item `index` moved by `delta` places (clamped). */
export function moveProvider(list: ProviderSetting[], index: number, delta: number): ProviderSetting[] {
  const target = Math.max(0, Math.min(list.length - 1, index + delta));
  if (index < 0 || index >= list.length || target === index) return list.slice();
  const next = list.slice();
  const [item] = next.splice(index, 1);
  next.splice(target, 0, item);
  return next;
}

const key = (s: string): I18nKey | null => (s in COMPANION_LOCALES.en ? (s as I18nKey) : null);
const label = (s: string, fallback: string) => {
  const k = key(s);
  return k ? tr(k) : fallback;
};

const ICON_UP = 'M7.41 15.41 12 10.83l4.59 4.58L18 14l-6-6-6 6z';
const ICON_DOWN = 'M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z';

function iconButton(pathD: string, text: string, disabled: boolean, onClick: () => void): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'icon-btn sm';
  btn.disabled = disabled;
  btn.setAttribute('aria-label', text);
  btn.dataset.oxituneTooltip = text;
  const ns = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('class', 'icon');
  svg.setAttribute('viewBox', '0 0 24 24');
  const path = document.createElementNS(ns, 'path');
  path.setAttribute('d', pathD);
  svg.appendChild(path);
  btn.appendChild(svg);
  btn.addEventListener('click', onClick);
  return btn;
}

/** Renders `list` into `container`; `onChange` gets every edited list. */
export function renderProviderList(
  container: HTMLElement,
  list: ProviderSetting[],
  onChange: (next: ProviderSetting[]) => void
): void {
  container.replaceChildren(
    ...list.map((p, i) => {
      const name = label(`settings.lyricsSrc.name.${p.id}`, p.id);
      const row = document.createElement('div');
      row.className = 'shortcut-row';

      const text = document.createElement('div');
      text.className = 'setting-text shortcut-name';
      const title = document.createElement('span');
      title.className = 'setting-title';
      title.textContent = name;
      const desc = document.createElement('span');
      desc.className = 'setting-desc';
      desc.textContent = UNOFFICIAL_PROVIDERS.has(p.id)
        ? `${label(`settings.lyricsSrc.desc.${p.id}`, '')} · ${tr('settings.lyricsSrc.unofficial')}`
        : label(`settings.lyricsSrc.desc.${p.id}`, '');
      text.append(title, desc);

      const up = iconButton(ICON_UP, tr('settings.lyricsSrc.up', { name }), i === 0, () => onChange(moveProvider(list, i, -1)));
      const down = iconButton(ICON_DOWN, tr('settings.lyricsSrc.down', { name }), i === list.length - 1, () =>
        onChange(moveProvider(list, i, 1))
      );

      const toggle = document.createElement('label');
      toggle.className = 'toggle';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.checked = p.enabled;
      input.setAttribute('aria-label', name);
      input.addEventListener('change', () => onChange(list.map((x, j) => (j === i ? { ...x, enabled: input.checked } : x))));
      const track = document.createElement('span');
      track.className = 'toggle-track';
      toggle.append(input, track);

      row.append(text, up, down, toggle);
      return row;
    })
  );
}
