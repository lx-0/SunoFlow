import { apiGet, apiPost } from "./client";

// Timecoded emoji reactions on a song (the player's reaction timeline). GET lists
// reactions ({ reactions: [{ id, emoji, timestamp }] }, optionalAuth → bearer ok);
// POST adds one at a playback timestamp.

export interface Reaction {
  id: string;
  emoji: string;
  /** seconds into the track */
  timestamp: number;
}

function toReaction(raw: unknown): Reaction | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.emoji !== "string" || typeof r.timestamp !== "number") return null;
  return { id: String(r.id ?? `${r.emoji}:${r.timestamp}`), emoji: r.emoji, timestamp: r.timestamp };
}

export async function fetchReactions(songId: string): Promise<Reaction[]> {
  const res = await apiGet<{ reactions?: unknown[] }>(`/api/songs/${songId}/reactions`);
  return (Array.isArray(res?.reactions) ? res.reactions : [])
    .map(toReaction)
    .filter((r): r is Reaction => r !== null);
}

export async function addReaction(songId: string, emoji: string, timestamp: number): Promise<Reaction | null> {
  const created = await apiPost<unknown>(`/api/songs/${songId}/reactions`, {
    emoji,
    timestamp: Math.max(0, timestamp),
  });
  return toReaction(created);
}
