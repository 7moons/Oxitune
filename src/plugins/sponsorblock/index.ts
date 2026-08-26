import { YTMDPlugin, PluginContext, TrackInfo } from '../types';

interface Segment {
  category: string;
  segment: [number, number];
  UUID: string;
}

let segments: Segment[] = [];
let lastVideoId = '';
let skippedSegments = new Set<string>();

// Pure staleness check, covered directly by src/tests/sponsorblock.test.ts:
// a fetch kicked off for one video must never overwrite `segments` after the
// user has already skipped ahead to a different video.
export const isFreshSegmentResponse = (requestedVideoId: string, latestVideoId: string): boolean =>
  requestedVideoId === latestVideoId;

export const SponsorblockPlugin: YTMDPlugin = {
  id: 'sponsorblock',
  name: 'SponsorBlock for Music',
  description: 'Automatically skips non-music portions, music video intros/outros and sponsorships',
  defaultEnabled: true,

  onInit() {
    segments = [];
    lastVideoId = '';
    skippedSegments = new Set<string>();
  },

  onTrackChange(track: TrackInfo) {
    if (!track.videoId || track.videoId === lastVideoId) return;
    const requestedVideoId = track.videoId;
    lastVideoId = requestedVideoId;
    segments = [];
    skippedSegments = new Set<string>();

    const categories = JSON.stringify(['music_offtopic', 'intro', 'outro', 'sponsor', 'selfpromo']);
    const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${requestedVideoId}&categories=${encodeURIComponent(categories)}`;

    fetch(url, { signal: AbortSignal.timeout(3000) })
      .then(async (res) => {
        if (!res.ok) return;
        const data = (await res.json()) as Segment[];
        // Guard against a slower, now-stale response for a previous video
        // landing after the user has already moved on to another track.
        if (!isFreshSegmentResponse(requestedVideoId, lastVideoId)) return;
        segments = data;
        console.log(`[YTMD SponsorBlock] Loaded ${data.length} segments for ${requestedVideoId}`);
      })
      .catch(() => {
        // SponsorBlock segment not found or network offline
      });
  },

  onTick(currentTimeSecs: number, ctx: PluginContext) {
    if (!segments || segments.length === 0) return;
    // Skip each segment only once. Without this, re-checking "are we inside
    // a segment" on every tick means manually seeking back into an already-
    // skipped range gets immediately overridden right back to its end —
    // the segment becomes permanently unreachable ("can't seek back").
    const skipped = skippedSegments;

    for (const seg of segments) {
      const [start, end] = seg.segment;
      if (currentTimeSecs >= start && currentTimeSecs < end - 0.5 && !skipped.has(seg.UUID)) {
        console.log(`[YTMD SponsorBlock] Skipping segment (${seg.category}): ${start}s -> ${end}s`);
        const video = ctx.getVideoElement();
        if (video) {
          video.currentTime = end;
          skipped.add(seg.UUID);
        }
        break;
      }
    }
  }
};
