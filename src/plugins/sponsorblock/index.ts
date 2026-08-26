import { YTMDPlugin, PluginContext, TrackInfo } from '../types';

interface Segment {
  category: string;
  segment: [number, number];
  UUID: string;
}

let segments: Segment[] = [];
let lastVideoId = '';

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
    lastVideoId = track.videoId;
    segments = [];

    try {
      const categories = JSON.stringify(['music_offtopic', 'intro', 'outro', 'sponsor', 'selfpromo']);
      const url = `https://sponsor.ajay.app/api/skipSegments?videoID=${track.videoId}&categories=${encodeURIComponent(categories)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = (await res.json()) as Segment[];
        segments = data;
        console.log(`[YTMD SponsorBlock] Loaded ${data.length} segments for ${track.videoId}`);
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
