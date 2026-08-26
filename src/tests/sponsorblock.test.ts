import { describe, expect, test } from 'bun:test';
import { isFreshSegmentResponse } from '../plugins/sponsorblock';

describe('SponsorBlock: stale response guard', () => {
  test('accepts a response for the video that is still current', () => {
    expect(isFreshSegmentResponse('video-A', 'video-A')).toBe(true);
  });

  test('rejects a response for a video the user has already skipped past', () => {
    // Fetch was kicked off for video-A, but by the time it resolves the
    // user has already moved on to video-B — applying it would skip the
    // wrong parts of the wrong song.
    expect(isFreshSegmentResponse('video-A', 'video-B')).toBe(false);
  });

  test('rapid back-to-back track changes: only the latest fetch may apply', () => {
    let latestVideoId = 'video-A';
    const results: string[] = [];

    const applyIfFresh = (requestedId: string) => {
      if (isFreshSegmentResponse(requestedId, latestVideoId)) {
        results.push(requestedId);
      }
    };

    // User skips A -> B -> C quickly; A's slow fetch resolves last.
    latestVideoId = 'video-B';
    latestVideoId = 'video-C';
    applyIfFresh('video-A'); // stale, must not apply
    applyIfFresh('video-C'); // fresh, applies

    expect(results).toEqual(['video-C']);
  });
});
