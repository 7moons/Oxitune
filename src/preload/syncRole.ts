/**
 * Whether this page is a guest in a Listen Together room. Set by the
 * sync-room plugin; read by plugins that would otherwise move the player on
 * their own (crossfade's early skip, skip-silence, and installed plugins
 * that seek, via `oxitune.player.canSeekAutomatically()`).
 * A guest's position belongs to the host, and every such local move was
 * undone by the next sync, audibly, over and over.
 */
let guest = false;

export function setSyncGuest(isGuest: boolean): void {
  guest = isGuest;
}

export function isSyncGuest(): boolean {
  return guest;
}

/**
 * The host of a room with songs in the shared queue: "next" means the
 * queue's next song, not YTM's own up-next. Set by the sync-room plugin;
 * `PlayerBridge.next()` asks it first, so the player-bar button, media
 * keys, tray, a guest's skip, a vote, crossfade and skip-silence all agree.
 * Returns whether it took the skip over.
 */
let roomNext: (() => boolean) | null = null;

export function setRoomNextOverride(override: (() => boolean) | null): void {
  roomNext = override;
}

export function takeRoomNext(): boolean {
  return roomNext?.() ?? false;
}
