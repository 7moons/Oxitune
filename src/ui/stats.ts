/**
 * The "Listening stats" section of Settings: what the backend counted
 * (stats.rs), which never leaves this computer.
 */
import { showToast } from '../preload/ui/kit';
import { tr } from './i18n';

export interface StatsSummary {
  since_ms: number;
  total_ms: number;
  total_plays: number;
  songs: number;
  artists: number;
  top_tracks: { video_id: string; title: string; artist: string; plays: number; listened_ms: number }[];
  top_artists: { artist: string; plays: number; listened_ms: number }[];
  days: { day: number; listened_ms: number }[];
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** "3 h 05 min", "12 min", "0 min": whole minutes, hours once there are any. */
export function formatListenTime(ms: number): string {
  const minutes = Math.floor(Math.max(0, Number.isFinite(ms) ? ms : 0) / 60_000);
  const hours = Math.floor(minutes / 60);
  if (hours === 0) return `${minutes} min`;
  return `${hours} h ${String(minutes % 60).padStart(2, '0')} min`;
}

/** Bar heights in percent of the busiest day; a day with any music at all
 * stays visible. */
export function dayBarHeights(days: { listened_ms: number }[]): number[] {
  const max = Math.max(0, ...days.map((d) => d.listened_ms));
  if (max === 0) return days.map(() => 0);
  return days.map((d) => (d.listened_ms > 0 ? Math.max(4, Math.round((d.listened_ms / max) * 100)) : 0));
}

/** A day number (days since the Unix epoch, UTC) as a short date. */
export function dayLabel(day: number, locale?: string): string {
  return new Date(day * MS_PER_DAY).toLocaleDateString(locale, { day: 'numeric', month: 'short', timeZone: 'UTC' });
}

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, className: string, text?: string) => {
  const node = document.createElement(tag);
  node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

function renderRanking(
  list: HTMLElement,
  rows: { primary: string; secondary?: string; plays: number; listened_ms: number }[]
): void {
  list.replaceChildren(
    ...rows.map((row, index) => {
      const item = el('li', 'stats-row');
      item.append(el('span', 'stats-rank', String(index + 1)));
      const text = el('span', 'stats-row-text');
      text.append(el('span', 'stats-row-title', row.primary));
      if (row.secondary) text.append(el('span', 'stats-row-sub', row.secondary));
      item.append(text);
      item.append(el('span', 'stats-row-plays', tr('settings.stats.playsCount', { count: row.plays })));
      item.append(el('span', 'stats-row-time', formatListenTime(row.listened_ms)));
      return item;
    })
  );
}

export function renderStats(root: HTMLElement, summary: StatsSummary): void {
  const set = (id: string, text: string) => {
    const node = root.querySelector<HTMLElement>(`#${id}`);
    if (node) node.textContent = text;
  };
  const empty = summary.total_ms <= 0;
  root.querySelector('#stats-empty')?.classList.toggle('is-hidden', !empty);
  root.querySelector('#stats-body')?.classList.toggle('is-hidden', empty);
  if (empty) return;

  set('stats-total-time', formatListenTime(summary.total_ms));
  set('stats-total-plays', String(summary.total_plays));
  set('stats-total-songs', String(summary.songs));
  set('stats-total-artists', String(summary.artists));
  set(
    'stats-since',
    summary.since_ms > 0
      ? tr('settings.stats.since', {
          date: new Date(summary.since_ms).toLocaleDateString(document.documentElement.lang || undefined)
        })
      : ''
  );

  const chart = root.querySelector<HTMLElement>('#stats-days');
  if (chart) {
    const heights = dayBarHeights(summary.days);
    chart.replaceChildren(
      ...summary.days.map((d, i) => {
        const bar = el('span', 'stats-day');
        bar.style.setProperty('--h', `${heights[i]}%`);
        bar.title = `${dayLabel(d.day, document.documentElement.lang || undefined)}: ${formatListenTime(d.listened_ms)}`;
        return bar;
      })
    );
  }

  const tracks = root.querySelector<HTMLElement>('#stats-top-tracks');
  if (tracks) {
    renderRanking(
      tracks,
      summary.top_tracks.map((t) => ({ primary: t.title || t.video_id, secondary: t.artist, plays: t.plays, listened_ms: t.listened_ms }))
    );
  }
  const artists = root.querySelector<HTMLElement>('#stats-top-artists');
  if (artists) {
    renderRanking(
      artists,
      summary.top_artists.map((a) => ({ primary: a.artist, plays: a.plays, listened_ms: a.listened_ms }))
    );
  }
}

export function initStatsSection(errorMessage: (e: unknown) => string): void {
  const root = document.getElementById('sec-stats');
  const invoke = window.__TAURI__?.core.invoke;
  if (!root || !invoke) return;

  const refresh = async () => {
    try {
      renderStats(root, (await invoke('get_listening_stats')) as StatsSummary);
    } catch (e) {
      showToast(errorMessage(e));
    }
  };

  document.querySelector('.settings-nav-item[data-section="sec-stats"]')?.addEventListener('click', () => void refresh());
  document.getElementById('stats-refresh-btn')?.addEventListener('click', () => void refresh());
  document.getElementById('stats-export-btn')?.addEventListener('click', async () => {
    try {
      if (await invoke('export_listening_stats')) showToast(tr('settings.stats.exported'));
    } catch (e) {
      showToast(errorMessage(e));
    }
  });
  // Two clicks: the first arms the button, so one slip can't wipe everything.
  const clearBtn = document.getElementById('stats-clear-btn');
  let armed: ReturnType<typeof setTimeout> | null = null;
  clearBtn?.addEventListener('click', async () => {
    if (armed === null) {
      clearBtn.textContent = tr('settings.stats.clearConfirm');
      armed = setTimeout(() => {
        armed = null;
        clearBtn.textContent = tr('settings.stats.clear');
      }, 4000);
      return;
    }
    clearTimeout(armed);
    armed = null;
    clearBtn.textContent = tr('settings.stats.clear');
    try {
      await invoke('clear_listening_stats');
      showToast(tr('settings.stats.cleared'));
      await refresh();
    } catch (e) {
      showToast(errorMessage(e));
    }
  });

  void refresh();
}
