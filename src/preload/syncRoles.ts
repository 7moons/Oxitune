/**
 * Listen Together roles, shared by the injected sync plugin and the sync
 * window. Mirrors `MemberRole` in src-tauri/src/sync_room.rs; the host's
 * backend enforces every rule, this only decides what the UI offers.
 */
export type MemberRole = 'host' | 'moderator' | 'dj' | 'listener';

const RANK: Record<MemberRole, number> = { host: 3, moderator: 2, dj: 1, listener: 0 };

/** A member from a host that predates roles has none: the host is the host,
 * everyone else could control playback, i.e. a DJ. */
export function roleOf(member: { is_host: boolean; role?: MemberRole }): MemberRole {
  return member.is_host ? 'host' : (member.role ?? 'dj');
}

export function canControl(role: MemberRole): boolean {
  return role !== 'listener';
}

/** The reactions a room accepts (`REACTIONS` in sync_room/features.rs). */
export const SYNC_REACTIONS = ['🔥', '❤️', '😂', '👏', '😮', '💃'] as const;

/** Votes that skip a song: more than half the room (`votes_needed`). */
export function votesNeeded(members: number): number {
  return Math.floor(members / 2) + 1;
}

/** Host removes anyone else; a moderator removes DJs and listeners. */
export function canKick(actor: MemberRole, target: MemberRole): boolean {
  return RANK[actor] >= RANK.moderator && RANK[actor] > RANK[target];
}
