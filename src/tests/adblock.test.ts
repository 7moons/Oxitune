import { describe, expect, test } from 'bun:test';
import { sanitizePlayerResponse, AdblockPlugin } from '../plugins/adblock';
import { PluginRegistry } from '../plugins/registry';
import { PluginContext } from '../plugins/types';

describe('Adblock & InnerTube Sanitizer Suite', () => {
  const dummyContext: PluginContext = {
    track: null,
    config: {},
    invoke: async () => null,
    sendPlayerCommand: () => {},
    getVideoElement: () => null
  };

  test('prunes root adPlacements, playerAds, and adSlots from player response', () => {
    const mockResponse = {
      responseContext: { visitorData: 'abc123xyz' },
      playabilityStatus: { status: 'OK' },
      streamingData: {
        adaptiveFormats: [
          { itag: 251, mimeType: 'audio/webm', url: 'https://googlevideo.com/videoplayback' }
        ]
      },
      videoDetails: { title: 'Starboy', author: 'The Weeknd' },
      adPlacements: [
        { adPlacementRenderer: { config: { adTimeOffset: '0' } } }
      ],
      playerAds: [
        { playerLegacyDesktopWatchAdsRenderer: { playerAdParams: { showAd: true } } }
      ],
      adSlots: [
        { adSlotRenderer: { slotId: 'OPENING_SLOT' } }
      ],
      adBreakHeartbeatParams: 'token12345'
    };

    const sanitized = sanitizePlayerResponse(mockResponse);

    expect(sanitized.adPlacements).toBeUndefined();
    expect(sanitized.playerAds).toBeUndefined();
    expect(sanitized.adSlots).toBeUndefined();
    expect(sanitized.adBreakHeartbeatParams).toBeUndefined();
    expect(sanitized.videoDetails.title).toBe('Starboy');
    expect(sanitized.streamingData.adaptiveFormats.length).toBe(1);
  });

  test('prunes nested playerResponse ad definitions in /next and browse responses', () => {
    const mockNextResponse = {
      currentVideoEndpoint: { watchEndpoint: { videoId: 'dQw4w9WgXcQ' } },
      playerResponse: {
        playabilityStatus: { status: 'OK' },
        adPlacements: [{ adPlacementRenderer: {} }],
        playerAds: [{ playerAd: {} }],
        videoDetails: { title: 'Never Gonna Give You Up' }
      }
    };

    const sanitized = sanitizePlayerResponse(mockNextResponse);

    expect(sanitized.playerResponse.adPlacements).toBeUndefined();
    expect(sanitized.playerResponse.playerAds).toBeUndefined();
    expect(sanitized.playerResponse.videoDetails.title).toBe('Never Gonna Give You Up');
  });

  test('handles null, undefined, primitives and arrays safely', () => {
    expect(sanitizePlayerResponse(null)).toBeNull();
    expect(sanitizePlayerResponse(undefined)).toBeUndefined();
    expect(sanitizePlayerResponse('some string')).toBe('some string');
    expect(sanitizePlayerResponse(12345)).toBe(12345);

    const arr = [
      { id: 1, adSlots: [{ slot: '1' }], title: 'Track 1' },
      { id: 2, title: 'Track 2' }
    ];
    const sanitizedArr = sanitizePlayerResponse(arr);
    expect(sanitizedArr[0].adSlots).toBeUndefined();
    expect(sanitizedArr[0].title).toBe('Track 1');
    expect(sanitizedArr[1].title).toBe('Track 2');
  });

  test('AdblockPlugin initializes and registers in PluginRegistry', async () => {
    const registry = new PluginRegistry(dummyContext);
    registry.register(AdblockPlugin);

    expect(registry.getRegisteredPlugins().length).toBe(1);
    expect(registry.isEnabled('adblock')).toBe(true);

    await registry.initAll();
    expect(registry.isEnabled('adblock')).toBe(true);

    await registry.disable('adblock');
    expect(registry.isEnabled('adblock')).toBe(false);
  });
});
