import { MILESTONE_CATALOG, asNumber, asRecord, asString } from "@sunoflow/core";
import { apiGet } from "@/api/client";

// Stats / Insights data. Three independent bearer endpoints, each mapped
// defensively — the web handlers return raw JSON (no envelope):
//   GET /api/streaks        -> { streak: { currentStreak, longestStreak, lastActiveDate } }
//   GET /api/milestones     -> { milestones: [{ type, earnedAt, label, description, emoji }] }
//   GET /api/analytics/user -> UserDashboardStats (flat object)
// Any missing/odd field degrades to a safe default; nothing throws on shape drift.

export interface Streak {
  currentStreak: number;
  longestStreak: number;
}

export interface Milestone {
  type: string;
  label: string;
  description: string;
  emoji: string;
  achieved: boolean;
}

export interface UserStats {
  totalGenerations: number;
  completedGenerations: number;
  totalFavorites: number;
  totalPlaylists: number;
  averageRating: number | null;
  ratedSongsCount: number;
}

// The full milestone catalog lives in @sunoflow/core (shared with the web award
// logic); the API only returns the ones the user has earned, so we render the
// catalog and mark achieved by set-membership.

/** Count fields arrive as integers; truncate defensively in case of drift. */
function toInt(v: unknown): number {
  return Math.trunc(asNumber(v, 0));
}

export async function fetchStreaks(): Promise<Streak> {
  const raw = asRecord(await apiGet<unknown>("/api/streaks")) ?? {};
  const s = asRecord(raw.streak) ?? {};
  return {
    currentStreak: toInt(s.currentStreak),
    longestStreak: toInt(s.longestStreak),
  };
}

export async function fetchMilestones(): Promise<Milestone[]> {
  const raw = asRecord(await apiGet<unknown>("/api/milestones")) ?? {};
  const list = Array.isArray(raw.milestones) ? raw.milestones : [];
  const earned = new Set<string>();
  for (const m of list) {
    const t = asString(asRecord(m)?.type);
    if (t) earned.add(t);
  }
  return MILESTONE_CATALOG.map((m) => ({ ...m, achieved: earned.has(m.type) }));
}

export async function fetchUserStats(): Promise<UserStats> {
  const raw = asRecord(await apiGet<unknown>("/api/analytics/user")) ?? {};
  return {
    totalGenerations: toInt(raw.totalGenerations),
    completedGenerations: toInt(raw.completedGenerations),
    totalFavorites: toInt(raw.totalFavorites),
    totalPlaylists: toInt(raw.totalPlaylists),
    averageRating: asNumber(raw.averageRating),
    ratedSongsCount: toInt(raw.ratedSongsCount),
  };
}
