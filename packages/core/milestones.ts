// Milestone catalog — shared business data for the web (awards + display) and the
// mobile stats screen (locked/achieved list). The awarding logic (prisma) stays
// in the web's src/lib/streaks/milestones.ts; only the pure catalog lives here.

export const MILESTONE_TYPES = [
  "first_song",
  "songs_10",
  "songs_100",
  "first_follower",
  "streak_5",
] as const;

export type MilestoneType = (typeof MILESTONE_TYPES)[number];

export interface MilestoneMeta {
  label: string;
  description: string;
  emoji: string;
}

export const MILESTONE_META: Record<MilestoneType, MilestoneMeta> = {
  first_song: { label: "First Song", description: "Generated your first song", emoji: "🎵" },
  songs_10: { label: "10 Songs", description: "Generated 10 songs", emoji: "🎶" },
  songs_100: { label: "100 Songs", description: "Generated 100 songs", emoji: "🎸" },
  first_follower: { label: "First Follower", description: "Got your first follower", emoji: "🌟" },
  streak_5: { label: "5-Day Streak", description: "Active 5 days in a row", emoji: "🔥" },
};

/** Ordered (type + meta) list for rendering the full milestone set. */
export const MILESTONE_CATALOG: ReadonlyArray<{ type: MilestoneType } & MilestoneMeta> =
  MILESTONE_TYPES.map((type) => ({ type, ...MILESTONE_META[type] }));
