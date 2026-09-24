import { describe, expect, test } from 'bun:test';
import { readFileSync } from 'fs';

const page = readFileSync('pages/join/index.html', 'utf8');
const rust = readFileSync('src-tauri/src/sync_room.rs', 'utf8');
const joinLink = readFileSync('src-tauri/src/join_link.rs', 'utf8');

describe('Discord "Listen along" landing page', () => {
  const alphabet = rust.match(/const CHARS: &\[u8\] = b"([A-Z0-9]+)";\s*let mut rng = rand::rng\(\);\s*let code/)?.[1];

  test('accepts exactly the room-code alphabet the app generates', () => {
    expect(alphabet).toBeTruthy();
    expect(page).toContain(`/^YTMD-[${alphabet}]{10}$/`);
  });

  test('reads the code only from the # part and opens the ytmd:// link', () => {
    expect(page).toContain('location.hash');
    expect(page).not.toContain('location.search');
    expect(page).toContain("'ytmd://join/' + code");
  });

  test('is the page the app links to', () => {
    expect(joinLink).toContain('pub const INVITE_PAGE: &str = "https://kayzedd.github.io/ytmd/join/";');
  });
});
