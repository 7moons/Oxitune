/**
 * Pure formatting/filtering helpers shared by the companion windows. Kept
 * DOM-free in their own module so tests import the real implementations.
 */

export function formatDuration(secs: number): string {
  if (isNaN(secs) || secs <= 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}

export function formatDb(db: number): string {
  const sign = db > 0 ? '+' : '';
  return `${sign}${db.toFixed(1)}`;
}

export function formatCrossfade(secs: number, offLabel: string): string {
  if (secs <= 0) return offLabel;
  return `${secs.toFixed(1)} s`;
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || 'U';
}

export interface SearchableTrack {
  title: string;
  artist: string;
  album?: string | null;
}

/** Case-insensitive match on title, artist or album. */
export function filterTracks<T extends SearchableTrack>(tracks: T[], query: string): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return tracks;
  return tracks.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.artist.toLowerCase().includes(q) ||
      (!!t.album && t.album.toLowerCase().includes(q))
  );
}

/** Where playback is now, given the last report from the main window.
 * The main window only reports on track/play-state changes, seeks and
 * every ~15s, so the mini player advances the clock itself in between. */
export function estimatePosition(
  track: { current_time_secs: number; duration_secs: number; is_playing: boolean },
  receivedAtMs: number,
  nowMs: number
): number {
  const elapsed = track.is_playing ? Math.max(0, (nowMs - receivedAtMs) / 1000) : 0;
  const pos = track.current_time_secs + elapsed;
  return track.duration_secs > 0 ? Math.min(pos, track.duration_secs) : pos;
}
