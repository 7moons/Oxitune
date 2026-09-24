/**
 * Settings → Plugins: the plugin manager (src-tauri/src/plugins/).
 *
 * Installed plugins (on/off, their settings, uninstall, updates that need
 * consent), what the user's registries offer, the registries themselves,
 * update checks, and loading a plugin from a folder (developer mode).
 * Permissions are shown before every install and before any update that
 * asks for more.
 */
import { createEl } from '../utils/dom';
import { openDialog, showToast } from '../preload/ui/kit';
import { companionLocale, isI18nKey, tr } from './i18n';
import type { LocalizedText, PluginManifest, SettingSpec } from '../plugins/types';

interface IndexEntry {
  id: string;
  name: string;
  version: string;
  apiVersion: number;
  description: string;
  author: string;
  permissions: string[];
  url: string;
  sha256: string;
}

interface Installed {
  version: string;
  source: 'registry' | 'dev';
  registry?: string;
  dev_path?: string;
  enabled: boolean;
  granted: string[];
  auto_disabled: boolean;
  errors: number;
  pending_update?: IndexEntry;
}

interface PluginInfo {
  manifest: PluginManifest | null;
  id: string;
  installed: Installed;
  settings: Record<string, unknown>;
  error: string | null;
}

interface Registry {
  url: string;
  public_key: string;
  name: string;
  official: boolean;
}

interface Overview {
  plugins: PluginInfo[];
  registries: Registry[];
  officialHidden: boolean;
  mediaDir: string;
  mediaInUse: boolean;
  updateIntervalHours: number;
  restartNeeded: boolean;
}

interface Available {
  registry: string;
  registryName: string;
  entry: IndexEntry;
  installedVersion: string | null;
}

const invoke = (cmd: string, args?: Record<string, unknown>) => {
  const core = window.__TAURI__?.core;
  return core ? core.invoke(cmd, args) : Promise.reject(new Error('Tauri unavailable'));
};

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

function errorText(e: unknown): string {
  const raw = typeof e === 'string' ? e : e instanceof Error ? e.message : String(e);
  return isI18nKey(raw) ? tr(raw) : raw;
}

/** A manifest label in the window's language, falling back to English. */
export function localized(text: LocalizedText | undefined): string {
  if (text === undefined) return '';
  if (typeof text === 'string') return text;
  return text[companionLocale()] ?? text.en ?? Object.values(text)[0] ?? '';
}

export function permissionLabel(permission: string): string {
  const key = `plugins.perm.${permission}`;
  return isI18nKey(key) ? tr(key) : permission;
}

function permissionList(permissions: string[], hosts: string[] = []): HTMLElement {
  const list = createEl('ul', { className: 'plugin-perms' });
  if (permissions.length === 0) list.append(createEl('li', { text: tr('plugins.consent.none') }));
  for (const p of permissions) list.append(createEl('li', { text: permissionLabel(p) }));
  if (hosts.length > 0) list.append(createEl('li', { text: tr('plugins.consent.hosts', { hosts: hosts.join(', ') }) }));
  return list;
}

/** Shows what a plugin may do; resolves true if the user agrees. */
function askConsent(name: string, permissions: string[], hosts: string[] = []): Promise<boolean> {
  return new Promise((resolve) => {
    let answered = false;
    const answer = (v: boolean) => {
      if (!answered) {
        answered = true;
        resolve(v);
      }
    };
    const dialog = openDialog({
      id: 'ytmd-plugin-consent',
      title: tr('plugins.consent.title', { name }),
      body: [permissionList(permissions, hosts), createEl('p', { className: 'setting-desc', text: tr('plugins.consent.note') })],
      actions: [
        { label: tr('plugins.consent.cancel'), onClick: (close) => { answer(false); close(); } },
        { label: tr('plugins.consent.allow'), filled: true, onClick: (close) => { answer(true); close(); } }
      ]
    });
    // Escape or clicking outside closes without an answer: that's a no.
    const observer = new MutationObserver(() => {
      if (!document.getElementById('ytmd-plugin-consent')) {
        observer.disconnect();
        answer(false);
      }
    });
    observer.observe(document.body, { childList: true });
    void dialog;
  });
}

function settingControl(plugin: PluginInfo, spec: SettingSpec): HTMLElement {
  const row = createEl('div', { className: 'setting-row' });
  const text = createEl('div', { className: 'setting-text' });
  text.append(createEl('span', { className: 'setting-title', text: localized(spec.label) }));
  if (spec.description) text.append(createEl('span', { className: 'setting-desc', text: localized(spec.description) }));
  row.append(text);
  const value = plugin.settings[spec.key];
  const save = (v: unknown) => {
    invoke('plugins_set_setting', { id: plugin.id, key: spec.key, value: v }).catch((e) => showToast(errorText(e)));
  };
  if (spec.type === 'boolean') {
    const label = createEl('label', { className: 'toggle' });
    const input = createEl('input');
    input.type = 'checkbox';
    input.checked = value === true;
    input.addEventListener('change', () => save(input.checked));
    label.append(input, createEl('span', { className: 'toggle-track' }));
    row.append(label);
  } else if (spec.type === 'select') {
    const select = createEl('select', { className: 'select' });
    for (const o of spec.options ?? []) {
      const option = createEl('option', { text: localized(o.label) });
      option.value = o.value;
      select.append(option);
    }
    select.value = String(value ?? '');
    select.addEventListener('change', () => save(select.value));
    row.append(select);
  } else {
    const input = createEl('input', { className: 'input narrow' });
    input.type = spec.type === 'number' ? 'number' : 'text';
    if (spec.min !== undefined) input.min = String(spec.min);
    if (spec.max !== undefined) input.max = String(spec.max);
    input.value = String(value ?? '');
    input.addEventListener('change', () => save(spec.type === 'number' ? Number(input.value) : input.value));
    row.append(input);
  }
  return row;
}

function installedCard(plugin: PluginInfo, refresh: () => void): HTMLElement {
  const m = plugin.manifest;
  const card = createEl('div', { className: 'plugin-card' });
  const head = createEl('div', { className: 'setting-row' });
  const text = createEl('div', { className: 'setting-text' });
  const title = createEl('span', { className: 'setting-title', text: m?.name ?? plugin.id });
  if (plugin.installed.source === 'dev') title.append(createEl('span', { className: 'plugin-badge', text: tr('plugins.dev.badge') }));
  text.append(title);
  text.append(createEl('span', { className: 'setting-desc', text: tr('plugins.version', { version: plugin.installed.version, author: m?.author ?? '?' }) }));
  if (m) text.append(createEl('span', { className: 'setting-desc', text: m.description }));
  head.append(text);

  const toggle = createEl('label', { className: 'toggle' });
  const input = createEl('input');
  input.type = 'checkbox';
  input.checked = plugin.installed.enabled && !plugin.installed.auto_disabled;
  input.addEventListener('change', () => {
    invoke('plugins_set_enabled', { id: plugin.id, enabled: input.checked })
      .then(refresh)
      .catch((e) => showToast(errorText(e)));
  });
  toggle.append(input, createEl('span', { className: 'toggle-track' }));
  head.append(toggle);
  card.append(head);

  if (plugin.installed.auto_disabled) card.append(createEl('p', { className: 'plugin-note', text: tr('plugins.autoDisabled') }));
  if (plugin.error) card.append(createEl('p', { className: 'plugin-note', text: tr('plugins.loadError', { reason: errorText(plugin.error) }) }));
  if (m) card.append(permissionList(plugin.installed.granted, m.hosts));

  const pending = plugin.installed.pending_update;
  if (pending && plugin.installed.registry) {
    const row = createEl('div', { className: 'setting-row' });
    row.append(createEl('span', { className: 'setting-desc', text: tr('plugins.pendingUpdate', { version: pending.version }) }));
    const review = createEl('button', { className: 'btn btn-tonal', text: tr('plugins.review') });
    review.addEventListener('click', () => void install(plugin.installed.registry!, pending, refresh));
    row.append(review);
    card.append(row);
  }

  if (m?.settings?.length) {
    const details = createEl('details', { className: 'plugin-settings' });
    details.append(createEl('summary', { text: tr('plugins.settings') }));
    for (const spec of m.settings) details.append(settingControl(plugin, spec));
    card.append(details);
  }

  const actions = createEl('div', { className: 'plugin-actions' });
  const remove = createEl('button', { className: 'btn btn-tonal', text: tr('plugins.uninstall') });
  remove.addEventListener('click', () => {
    invoke('plugins_uninstall', { id: plugin.id })
      .then(() => {
        showToast(tr('plugins.uninstalledToast'));
        refresh();
      })
      .catch((e) => showToast(errorText(e)));
  });
  actions.append(remove);
  card.append(actions);
  return card;
}

async function install(registry: string, entry: IndexEntry, refresh: () => void): Promise<void> {
  if (!(await askConsent(entry.name, entry.permissions))) return;
  try {
    const manifest = (await invoke('plugins_install', { registry, id: entry.id, accepted: entry.permissions })) as PluginManifest;
    showToast(tr('plugins.installedToast', { name: manifest.name }));
  } catch (e) {
    showToast(errorText(e), { durationMs: 8000 });
  }
  refresh();
}

async function showAvailable(refresh: () => void): Promise<void> {
  const box = $('plugins-available');
  if (!box) return;
  try {
    const available = (await invoke('plugins_available')) as Available[];
    box.replaceChildren();
    const fresh = available.filter((a) => a.installedVersion !== a.entry.version);
    if (fresh.length === 0) box.append(createEl('p', { className: 'setting-desc', text: tr('plugins.available.none') }));
    for (const a of fresh) {
      const row = createEl('div', { className: 'setting-row plugin-card' });
      const text = createEl('div', { className: 'setting-text' });
      text.append(createEl('span', { className: 'setting-title', text: `${a.entry.name} ${a.entry.version}` }));
      text.append(createEl('span', { className: 'setting-desc', text: `${a.entry.description} · ${a.entry.author} · ${a.registryName || a.registry}` }));
      row.append(text);
      const button = createEl('button', { className: 'btn btn-filled', text: a.installedVersion ? tr('plugins.update') : tr('plugins.install') });
      button.addEventListener('click', () => void install(a.registry, a.entry, refresh));
      row.append(button);
      box.append(row);
    }
  } catch (e) {
    showToast(errorText(e));
  }
}

function renderRegistries(registries: Registry[], refresh: () => void): void {
  const box = $('plugins-registries');
  if (!box) return;
  box.replaceChildren();
  for (const r of registries) {
    const row = createEl('div', { className: 'setting-row' });
    const text = createEl('div', { className: 'setting-text' });
    const title = createEl('span', { className: 'setting-title', text: r.official ? tr('plugins.registry.official') : r.name || r.url });
    if (r.official) title.append(' ', createEl('span', { className: 'chip', text: tr('plugins.registry.officialBadge') }));
    text.append(title);
    text.append(createEl('span', { className: 'setting-desc mono', text: r.url }));
    row.append(text);
    const remove = createEl('button', { className: 'btn btn-tonal', text: tr('plugins.registry.remove') });
    remove.addEventListener('click', () => {
      invoke('plugins_remove_registry', { url: r.url }).then(refresh).catch((e) => showToast(errorText(e)));
    });
    row.append(remove);
    box.append(row);
  }
}

export async function refreshPlugins(): Promise<void> {
  let overview: Overview;
  try {
    overview = (await invoke('plugins_list')) as Overview;
  } catch (e) {
    console.error('[YTMD] plugins_list failed:', e);
    return;
  }
  const refresh = () => void refreshPlugins();
  $('plugins-restart')?.classList.toggle('is-hidden', !overview.restartNeeded);
  const list = $('plugins-installed');
  list?.replaceChildren(...overview.plugins.map((p) => installedCard(p, refresh)));
  $('plugins-installed-empty')?.classList.toggle('is-hidden', overview.plugins.length > 0);
  renderRegistries(overview.registries, refresh);
  $('registry-restore-btn')?.classList.toggle('is-hidden', !overview.officialHidden);
  $('plugins-media')?.classList.toggle('is-hidden', !overview.mediaInUse);
  const mediaDir = $('plugins-media-dir');
  if (mediaDir) mediaDir.textContent = overview.mediaDir;
  const interval = $<HTMLSelectElement>('plugins-update-interval');
  if (interval) interval.value = String(overview.updateIntervalHours);
}

export function initPluginsSection(): void {
  const refresh = () => void refreshPlugins();
  void refreshPlugins();
  $('plugins-restart-btn')?.addEventListener('click', () => void invoke('restart_app'));
  $('plugins-browse-btn')?.addEventListener('click', () => void showAvailable(refresh));
  $('plugins-media-open')?.addEventListener('click', () => {
    invoke('plugins_open_media_dir').catch((e) => showToast(errorText(e)));
  });
  $('plugins-media-pick')?.addEventListener('click', () => {
    invoke('plugins_pick_media_dir').then(refresh).catch((e) => showToast(errorText(e)));
  });
  $('registry-restore-btn')?.addEventListener('click', () => {
    invoke('plugins_restore_official').then(refresh).catch((e) => showToast(errorText(e)));
  });
  $('registry-add-btn')?.addEventListener('click', async () => {
    const url = $<HTMLInputElement>('registry-url');
    const key = $<HTMLInputElement>('registry-key');
    if (!url?.value.trim() || !key?.value.trim()) return;
    try {
      await invoke('plugins_add_registry', { url: url.value.trim(), publicKey: key.value.trim() });
      url.value = '';
      key.value = '';
      showToast(tr('plugins.registry.added'));
      refresh();
    } catch (e) {
      showToast(errorText(e), { durationMs: 8000 });
    }
  });
  $<HTMLSelectElement>('plugins-update-interval')?.addEventListener('change', (e) => {
    const hours = Number((e.target as HTMLSelectElement).value);
    void invoke('plugins_set_update_interval', { hours });
  });
  $('plugins-check-btn')?.addEventListener('click', async () => {
    try {
      const count = (await invoke('plugins_check_updates')) as number;
      showToast(count > 0 ? tr('plugins.updates.done', { count }) : tr('plugins.updates.none'));
      refresh();
    } catch (e) {
      showToast(errorText(e));
    }
  });
  $('plugins-dev-btn')?.addEventListener('click', () => {
    openDialog({
      id: 'ytmd-plugin-dev',
      title: tr('plugins.dev.warnTitle'),
      body: [document.createTextNode(tr('plugins.dev.warnBody'))],
      actions: [
        { label: tr('plugins.consent.cancel') },
        {
          label: tr('plugins.dev.pick'),
          filled: true,
          onClick: async (close) => {
            close();
            try {
              const manifest = (await invoke('plugins_add_dev')) as PluginManifest | null;
              if (manifest) showToast(tr('plugins.dev.added', { name: manifest.name }));
              refresh();
            } catch (e) {
              showToast(errorText(e), { durationMs: 8000 });
            }
          }
        }
      ]
    });
  });
  // Background updates installed something: show it.
  void window.__TAURI__?.event.listen('plugins-updated', refresh);
}
