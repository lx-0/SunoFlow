import { prisma } from "@/lib/prisma";
import { createNotification } from "@/lib/notifications";
import { MILESTONE_TYPES, MILESTONE_META, type MilestoneType } from "@sunoflow/core";

// The milestone catalog (types + display meta) is the single source of truth in
// @sunoflow/core, shared with the mobile stats screen. Re-exported so existing
// importers of "@/lib/streaks/milestones" keep working. Awarding logic (prisma)
// stays below.
export { MILESTONE_TYPES, MILESTONE_META };
export type { MilestoneType };

async function awardMilestone(userId: string, type: MilestoneType): Promise<void> {
  const meta = MILESTONE_META[type];

  const existing = await prisma.userMilestone.findUnique({
    where: { userId_type: { userId, type } },
  });
  if (existing) return;

  await prisma.userMilestone.create({ data: { userId, type } });

  try {
    await createNotification({
      userId,
      type: "milestone_earned",
      title: `${meta.emoji} ${meta.label} unlocked!`,
      message: meta.description,
      href: "/profile",
    });
  } catch {
    // Non-critical — milestone row is already written
  }
}

export async function checkSongMilestones(userId: string): Promise<void> {
  const count = await prisma.song.count({
    where: { userId, generationStatus: "ready" },
  });

  if (count >= 1) await awardMilestone(userId, "first_song");
  if (count >= 10) await awardMilestone(userId, "songs_10");
  if (count >= 100) await awardMilestone(userId, "songs_100");
}

export async function checkFirstFollowerMilestone(userId: string): Promise<void> {
  await awardMilestone(userId, "first_follower");
}

export async function checkStreakMilestones(
  userId: string,
  currentStreak: number
): Promise<void> {
  if (currentStreak >= 5) await awardMilestone(userId, "streak_5");
}
