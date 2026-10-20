/**
 * What the lyrics lookup reads about songs from YouTube Music, read-only:
 * the song's tags (other names for its artist) from the player, and the
 * next song in the queue (to look its lyrics up ahead).
 */
import { parseTimeStrToSecs } from '../../preload/observer';

/** The part of `getPlayerResponse()` read here. */
type PlayerResponse = {
  videoDetails?: { videoId?: string };
  microformat?: { microformatDataRenderer?: { tags?: unknown } };
};

const MAX_TAGS = 20;

/** The song's tags on YouTube ("Glasshouse", "Paper lanterns Glasshouse", ...), but
 * only while the player's response is this song's: during a switch it can
 * still be the previous one's. */
export function songTags(response: PlayerResponse | undefined, videoId: string | undefined): string[] {
  if (!videoId || response?.videoDetails?.videoId !== videoId) return [];
  const tags = response.microformat?.microformatDataRenderer?.tags;
  if (!Array.isArray(tags)) return [];
  return tags.filter((t): t is string => typeof t === 'string' && t.trim() !== '').slice(0, MAX_TAGS);
}

/** A queue row's `data` (the parts read here). */
type QueueItemData = {
  videoId?: string;
  title?: { runs?: { text?: string }[] };
  shortBylineText?: { runs?: { text?: string }[] };
  lengthText?: { runs?: { text?: string }[] };
};

export type NextSong = { videoId: string; title: string; artist: string; durationSecs: number | null };

const text = (t: { runs?: { text?: string }[] } | undefined) => (t?.runs ?? []).map((r) => r.text ?? '').join('').trim();

/** The song after the playing one in YTM's queue, from the rows' `data`. */
export function nextInQueue(items: ArrayLike<Element & { data?: unknown }>): NextSong | null {
  const rows = Array.from(items);
  const playing = rows.findIndex((r) => r.hasAttribute('selected'));
  if (playing < 0) return null;
  const data = rows[playing + 1]?.data as QueueItemData | undefined;
  const videoId = data?.videoId;
  const title = text(data?.title);
  if (!videoId || !/^[A-Za-z0-9_-]{11}$/.test(videoId) || !title) return null;
  const length = parseTimeStrToSecs(text(data?.lengthText));
  return { videoId, title, artist: text(data?.shortBylineText), durationSecs: length > 0 ? length : null };
}
