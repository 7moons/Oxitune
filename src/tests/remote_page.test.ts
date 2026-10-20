import { describe, expect, test } from 'bun:test';
import {
  insertIndex,
  parseSearchResults,
  queueEntriesFromItems,
  resolveQueueIndex,
  shouldPublishState,
  type PublishedPageState
} from '../plugins/remote/ytm';

const runs = (text: string) => ({ runs: [{ text }] });

const listItem = (videoId: string, title: string, subtitle: string) => ({
  musicResponsiveListItemRenderer: {
    playlistItemData: { videoId },
    thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [{ url: 'small' }, { url: `https://i/${videoId}` }] } } },
    flexColumns: [
      { musicResponsiveListItemFlexColumnRenderer: { text: runs(title) } },
      { musicResponsiveListItemFlexColumnRenderer: { text: { runs: [{ text: 'Song' }, { text: ' • ' }, { text: subtitle }] } } }
    ]
  }
});

describe('YTM search response', () => {
  const response = {
    contents: {
      tabbedSearchResultsRenderer: {
        tabs: [
          {
            tabRenderer: {
              content: {
                sectionListRenderer: {
                  contents: [
                    {
                      musicCardShelfRenderer: {
                        title: { runs: [{ text: 'Neon Runner', navigationEndpoint: { watchEndpoint: { videoId: 'aaaaaaaaaaa' } } }] },
                        subtitle: runs('Song • Night Drive'),
                        thumbnail: { musicThumbnailRenderer: { thumbnail: { thumbnails: [{ url: 'https://i/top' }] } } }
                      }
                    },
                    {
                      musicShelfRenderer: {
                        contents: [
                          listItem('aaaaaaaaaaa', 'Neon Runner', 'Night Drive'),
                          listItem('bbbbbbbbbbb', 'Chrome Heart', 'Night Drive'),
                          // An artist row: no video id, not playable.
                          { musicResponsiveListItemRenderer: { flexColumns: [] } },
                          listItem('not-an-id', 'Broken', 'X')
                        ]
                      }
                    }
                  ]
                }
              }
            }
          }
        ]
      }
    }
  };

  test('playable songs in order, deduplicated, top result first', () => {
    const results = parseSearchResults(response);
    expect(results.map((r) => r.video_id)).toEqual(['aaaaaaaaaaa', 'bbbbbbbbbbb']);
    expect(results[0]).toEqual({ video_id: 'aaaaaaaaaaa', title: 'Neon Runner', subtitle: 'Song • Night Drive', thumbnail: 'https://i/top' });
    expect(results[1].subtitle).toBe('Song • Night Drive');
    expect(results[1].thumbnail).toBe('https://i/bbbbbbbbbbb');
  });

  test('limit and garbage input', () => {
    expect(parseSearchResults(response, 1)).toHaveLength(1);
    expect(parseSearchResults(null)).toEqual([]);
    expect(parseSearchResults('nope')).toEqual([]);
  });
});

const queueItem = (videoId: string, title: string, selected = false) => ({
  playlistPanelVideoRenderer: {
    videoId,
    title: runs(title),
    shortBylineText: runs('Night Drive'),
    thumbnail: { thumbnails: [{ url: `https://i/${videoId}` }] },
    selected
  }
});

const wrapped = (videoId: string, title: string) => ({
  playlistPanelVideoWrapperRenderer: { primaryRenderer: queueItem(videoId, title) }
});

describe('YTM queue store', () => {
  const items = [queueItem('aaaaaaaaaaa', 'Neon Runner'), queueItem('bbbbbbbbbbb', 'Chrome Heart', true), wrapped('ccccccccccc', 'Roller Mobster'), { automixPreviewVideoRenderer: {} }];

  test('entries carry index:videoId ids and the playing flag', () => {
    const entries = queueEntriesFromItems(items);
    expect(entries.map((e) => e.id)).toEqual(['0:aaaaaaaaaaa', '1:bbbbbbbbbbb', '2:ccccccccccc']);
    expect(entries[1]).toMatchObject({ title: 'Chrome Heart', artist: 'Night Drive', current: true });
    expect(entries[2].title).toBe('Roller Mobster');
  });

  test('an id is trusted only while its song is still at that index', () => {
    expect(resolveQueueIndex(items, '1:bbbbbbbbbbb')).toBe(1);
    // The queue shifted: find the song instead of acting on a neighbour.
    expect(resolveQueueIndex(items, '0:ccccccccccc')).toBe(2);
    expect(resolveQueueIndex(items, '0:zzzzzzzzzzz')).toBe(-1);
    expect(resolveQueueIndex(items, 'garbage')).toBe(-1);
  });

  test('play next goes right after the playing song, add goes to the end', () => {
    expect(insertIndex(items, true)).toBe(2);
    expect(insertIndex(items, false)).toBe(4);
    expect(insertIndex([queueItem('aaaaaaaaaaa', 'x')], true)).toBe(1);
  });
});

describe('page state publishing', () => {
  const base: PublishedPageState = {
    playing: true,
    position_secs: 10,
    sampled_at_ms: 0,
    volume: 0.5,
    muted: false,
    like: 'none',
    shuffle: false,
    repeat: 'none',
    accent: null
  };
  test('first report and visible changes are sent', () => {
    expect(shouldPublishState(null, base)).toBe(true);
    expect(shouldPublishState(base, { ...base, sampled_at_ms: 1000, position_secs: 11, like: 'like' })).toBe(true);
  });
  test('steady playback is not re-sent every second', () => {
    expect(shouldPublishState(base, { ...base, sampled_at_ms: 1000, position_secs: 11 })).toBe(false);
  });
  test('a seek or a long gap is sent', () => {
    expect(shouldPublishState(base, { ...base, sampled_at_ms: 1000, position_secs: 60 })).toBe(true);
    expect(shouldPublishState(base, { ...base, sampled_at_ms: 15_000, position_secs: 25 })).toBe(true);
  });
  test('paused: position must stay put', () => {
    const paused = { ...base, playing: false };
    expect(shouldPublishState(paused, { ...paused, sampled_at_ms: 5000 })).toBe(false);
    expect(shouldPublishState(paused, { ...paused, sampled_at_ms: 5000, position_secs: 30 })).toBe(true);
  });
});
