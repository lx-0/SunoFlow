import { recordActivity } from "@/lib/activity";
import {
  checkSongMilestones,
  checkStreakMilestones,
  recordDailyActivity,
} from "@/lib/streaks";
import type { SongReadyContext } from "./types";

/**
 * Update user-level engagement counters when a song becomes ready:
 *   - activity feed entry (song_created)
 *   - daily streak increment + streak-based achievement check
 *   - song-count milestone check
 *
 * Internal partial failures are isolated so e.g. a streak DB hiccup does
 * not prevent the activity row from being written.
 */
export async function recordSongReadyEngagement(ctx: SongReadyContext): Promise<void> {
  await Promise.all([
    recordActivity({
      userId: ctx.song.userId,
      type: "song_created",
      songId: ctx.song.id,
    }).catch(() => undefined),

    (async () => {
      try {
        const newStreak = await recordDailyActivity(ctx.song.userId);
        await checkStreakMilestones(ctx.song.userId, newStreak);
      } catch {
        // streak chain failed — engagement subsystem owns the recovery
      }
    })(),

    checkSongMilestones(ctx.song.userId).catch(() => undefined),
  ]);
}
