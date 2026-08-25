import { YTMDPlugin, PluginContext, TrackInfo } from '../types';

interface Segment {
  category: string;
  segment: [number, number];
  UUID: string;
}

export const SponsorblockPlugin: YTMDPlugin = {
  id: 'sponsorblock',
  name: 'SponsorBlock for Music',
  description: 'Automatically skips non-music portions, music video intros/outros and sponsorships',
  defaultEnabled: true,

  onInit() {
    (this as any)._segments = [] as Segment[];
    (this as any)._lastVideoId = '';
    (this as any)._skippedSegments = new Set<string>();
  },

  async onTrackChange(track: TrackInfo) {
    if (!track.videoId || track.videoId === (this as any)._lastVideoId) return;
    (this as any)._lastVideoId = track.videoId;
    (this as any)._segments = [];
    (this as any)._skippedSegments = new Set<string>();

    try {
      const categories = JSON.stringify(['music_offtopic', 'intro', 'outro', 'sponsor', 'selfpromo']);
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${track.videoId}&categories=${encodeURIComponent(categories)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as Segment[];
        (this as any)._segments = data;
        console.log(`[YTMD SponsorBlock] Loaded ${data.length} segments for ${track.videoId}`);
      }
    } catch (e) {
      // SponsorBlock segment not found or network offline
    }
  },

  onTick(currentTimeSecs: number, ctx: PluginContext) {
    const segments = (this as any)._segments as Segment[];
    if (!segments || segments.length === 0) return;
    // Skip each segment only once. Without this, re-checking "are we inside
    // a segment" on every tick means manually seeking back into an already-
    // skipped range gets immediately overridden right back to its end —
    // the segment becomes permanently unreachable ("can't seek back").
    const skipped = (this as any)._skippedSegments as Set<string>;

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
