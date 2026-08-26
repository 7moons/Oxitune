import { extractPalette } from '../plugins/ambient/color';

interface TrackPayload {
  title: string;
  artist: string;
  album?: string | null;
  cover_url?: string | null;
  duration_secs: number;
  current_time_secs: number;
  is_playing: boolean;
  video_id?: string | null;
}

let lastCoverUrl: string | null | undefined;

async function applyTrack(track: TrackPayload | null | undefined): Promise<void> {
  document.body.classList.toggle('is-playing', !!track?.is_playing);

  const coverUrl = track?.cover_url || null;
  if (coverUrl === lastCoverUrl) return;
  lastCoverUrl = coverUrl;

  const cover = document.getElementById('ambient-cover') as HTMLImageElement | null;
  if (cover) {
    cover.style.opacity = coverUrl ? '1' : '0';
    if (coverUrl) cover.src = coverUrl;
  }

  const palette = await extractPalette(coverUrl || '');
  const root = document.documentElement.style;
  root.setProperty('--ambient-accent', palette.accent);
  root.setProperty('--ambient-primary', palette.primary);
  root.setProperty('--ambient-secondary', palette.secondary);
}

/** Wires the `#ambient-backdrop` markup every companion window ships to the
 * track currently playing in the main YTM window. Fetches whatever is
 * already playing on load (a window opened mid-song shouldn't sit on the
 * default gradient for up to 15s waiting for the next periodic sync — see
 * `get_current_track` in commands.rs), then follows `track-changed`. */
export function initAmbientBackdrop(): void {
  const tauri = window.__TAURI__;

  if (tauri?.event) {
    tauri.event.listen<TrackPayload>('track-changed', (e) => {
      void applyTrack(e.payload);
    });
  }

  if (tauri?.core) {
    tauri.core
      .invoke('get_current_track')
      .then((track) => void applyTrack(track as TrackPayload | null))
      .catch(() => {
        // No track yet — the default ambient gradient stays.
      });
  }
}
