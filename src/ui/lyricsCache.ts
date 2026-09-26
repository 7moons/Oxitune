/**
 * Settings > Saved lyrics > Browse: what the lyrics cache holds for each
 * song (`list_lyrics_cache`), with a filter and a per-song remove
 * (`remove_lyrics_cache_entry`), so a wrong answer can be spotted and
 * dropped without clearing everything.
 */
import { openDialog, showToast } from '../preload/ui/kit';
import { providerName } from '../types/lyrics';
import { createEl } from '../utils/dom';
import { companionLocale, tr } from './i18n';

/** Mirrors `EntryInfo` in src-tauri/src/lyrics/cache.rs. */
export interface CacheEntry {
  video_id: string;
  song: { title: string; artist: string } | null;
  saved_at: number;
  picked: boolean;
  fresh: boolean;
  found: {
    provider: string;
    title: string;
    artist: string;
    synced: boolean;
    lines: number;
    preview: string;
  } | null;
}

const norm = (s: string) => s.trim().toLowerCase();

/** Whether `entry` matches the filter text (song, what was found, id). */
export function matchesFilter(entry: CacheEntry, filter: string): boolean {
  const f = norm(filter);
  if (!f) return true;
  return [entry.video_id, entry.song?.title, entry.song?.artist, entry.found?.title, entry.found?.artist]
    .some((s) => !!s && norm(s).includes(f));
}

/** The found lyrics' own title and artist, when they aren't the song's
 * (the thing to check when lyrics look wrong). */
export function foundDiffers(entry: CacheEntry): boolean {
  if (!entry.found || !entry.song) return false;
  return norm(entry.found.title) !== norm(entry.song.title) || norm(entry.found.artist) !== norm(entry.song.artist);
}

function row(entry: CacheEntry, onRemove: (el: HTMLElement) => void): HTMLElement {
  const el = createEl('div', { className: 'setting-row lyrics-cache-row' });
  const text = createEl('div', { className: 'setting-text' });

  // Entries saved before the song was recorded: the found lyrics' own
  // title is the best name there is; a "not found" only has its id.
  const known = entry.song ?? (entry.found ? { title: entry.found.title, artist: entry.found.artist } : null);
  const title = createEl('span', {
    className: 'setting-title',
    text: known ? `${known.title} — ${known.artist}` : tr('settings.lyricsCache.unknownSong', { id: entry.video_id })
  });
  if (entry.picked) title.append(createEl('span', { className: 'plugin-badge', text: tr('settings.lyricsCache.picked') }));
  if (!entry.fresh) title.append(createEl('span', { className: 'plugin-badge', text: tr('settings.lyricsCache.stale') }));
  text.append(title);

  const found = entry.found;
  text.append(
    createEl('span', {
      className: 'setting-desc',
      text: found
        ? [
            providerName(found.provider, tr('settings.lyricsCache.localFiles')),
            found.synced ? tr('settings.lyricsCache.synced') : tr('settings.lyricsCache.plain'),
            tr('settings.lyricsCache.lines', { count: found.lines })
          ].join(' · ')
        : tr('settings.lyricsCache.notFound')
    })
  );
  if (found && foundDiffers(entry)) {
    text.append(createEl('span', { className: 'setting-desc', text: tr('settings.lyricsCache.foundAs', { title: found.title, artist: found.artist }) }));
  }
  if (found?.preview) {
    text.append(createEl('span', { className: 'setting-desc lyrics-cache-preview', text: tr('settings.lyricsCache.preview', { text: found.preview }) }));
  }
  text.append(
    createEl('span', {
      className: 'setting-desc',
      text: tr('settings.lyricsCache.savedAt', { date: new Date(entry.saved_at * 1000).toLocaleString(companionLocale()) })
    })
  );

  const remove = createEl('button', { className: 'btn btn-tonal', text: tr('settings.lyricsCache.remove') });
  remove.type = 'button';
  remove.addEventListener('click', () => onRemove(el));
  el.append(text, remove);
  return el;
}

export async function openLyricsCacheBrowser(): Promise<void> {
  const filter = createEl('input', { className: 'input lyrics-cache-filter' });
  filter.type = 'search';
  filter.placeholder = tr('settings.lyricsCache.filter');
  const summary = createEl('span', { className: 'setting-desc' });
  const list = createEl('div', { className: 'lyrics-cache-list' });
  list.append(createEl('div', { className: 'empty-state', text: tr('settings.lyricsCache.loading') }));
  openDialog({
    id: 'ytmd-lyrics-cache',
    title: tr('settings.lyricsCache.title'),
    body: [filter, summary, list],
    actions: [{ label: tr('window.close') }]
  });

  let entries: CacheEntry[] = [];
  try {
    entries = ((await window.__TAURI__?.core.invoke('list_lyrics_cache')) as CacheEntry[]) ?? [];
  } catch {
    showToast(tr('common.unknownError'));
  }

  const render = () => {
    const shown = entries.filter((e) => matchesFilter(e, filter.value));
    summary.textContent = tr('settings.lyricsCache.count', { shown: shown.length, total: entries.length });
    if (shown.length === 0) {
      list.replaceChildren(createEl('div', { className: 'empty-state', text: tr('settings.lyricsCache.empty') }));
      return;
    }
    list.replaceChildren(
      ...shown.map((entry) =>
        row(entry, async (el) => {
          try {
            await window.__TAURI__?.core.invoke('remove_lyrics_cache_entry', { videoId: entry.video_id });
            entries = entries.filter((e) => e !== entry);
            el.remove();
            summary.textContent = tr('settings.lyricsCache.count', {
              shown: entries.filter((e) => matchesFilter(e, filter.value)).length,
              total: entries.length
            });
          } catch {
            showToast(tr('common.unknownError'));
          }
        })
      )
    );
  };
  filter.addEventListener('input', render);
  render();
  filter.focus();
}
