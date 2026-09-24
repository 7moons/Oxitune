import { describe, expect, test } from 'bun:test';
import { resumeStep, RESUME_TIMEOUT_MS } from '../preload/resume';
import { playlistFromUrl } from '../preload/observer';

const target = { video_id: 'aaaaaaaaaaa' };

describe('resumeStep', () => {
  test('waits until the saved song is loaded, then applies', () => {
    expect(resumeStep(target, undefined, false, false, 0)).toBe('wait');
    expect(resumeStep(target, 'aaaaaaaaaaa', false, false, 100)).toBe('wait');
    expect(resumeStep(target, 'aaaaaaaaaaa', true, false, 200)).toBe('apply');
  });

  test('gives up on another song, in a room, or after the timeout', () => {
    expect(resumeStep(target, 'bbbbbbbbbbb', true, false, 100)).toBe('abandon');
    expect(resumeStep(target, 'aaaaaaaaaaa', true, true, 100)).toBe('abandon');
    expect(resumeStep(target, undefined, false, false, RESUME_TIMEOUT_MS + 1)).toBe('abandon');
  });
});

describe('playlistFromUrl', () => {
  test('only the watch page of the same song says which playlist plays', () => {
    expect(playlistFromUrl('?v=aaa&list=PL1', 'aaa')).toBe('PL1');
    expect(playlistFromUrl('?v=bbb&list=PL1', 'aaa')).toBeUndefined();
    expect(playlistFromUrl('?list=PL1', 'aaa')).toBeUndefined();
    expect(playlistFromUrl('?v=aaa', 'aaa')).toBeUndefined();
    expect(playlistFromUrl('?v=aaa&list=PL1', undefined)).toBeUndefined();
  });
});
