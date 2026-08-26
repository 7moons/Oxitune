import { YTMDPlugin, PluginContext, TrackInfo } from '../types';

interface Segment {
  category: string;
  segment: [number, number];
  UUID: string;
}

let segments: Segment[] = [];
let lastVideoId = '';

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
  },

  async onTrackChange(track: TrackInfo) {
    if (!track.videoId || track.videoId === lastVideoId) return;
    const requestedVideoId = track.videoId;
    lastVideoId = requestedVideoId;
    segments = [];

    try {
      const categories = JSON.stringify(['music_offtopic', 'intro', 'outro', 'sponsor', 'selfpromo']);
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${requestedVideoId}&categories=${encodeURIComponent(categories)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as Segment[];
        // Guard against a slower, now-stale response for a previous video
        // landing after the user has already moved on to another track.
        if (!isFreshSegmentResponse(requestedVideoId, lastVideoId)) return;
        segments = data;
        console.log(`[YTMD SponsorBlock] Loaded ${data.length} segments for ${requestedVideoId}`);
      }
    } catch (e) {
      // SponsorBlock segment not found or network offline
    }
  },

  onTick(currentTimeSecs: number, ctx: PluginContext) {
    if (!segments || segments.length === 0) return;

    for (const seg of segments) {
      const [start, end] = seg.segment;
      if (currentTimeSecs >= start && currentTimeSecs < end - 0.5) {
        console.log(`[YTMD SponsorBlock] Skipping segment (${seg.category}): ${start}s -> ${end}s`);
        const video = ctx.getVideoElement();
        if (video) {
          video.currentTime = end;
        }
        break;
      }
    }
  }
};
