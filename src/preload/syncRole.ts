/**
 * Whether this page is a guest in a Listen Together room. Set by the
 * sync-room plugin; read by plugins that would otherwise move the player on
 * their own (crossfade's early skip, skip-silence and SponsorBlock jumps).
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
