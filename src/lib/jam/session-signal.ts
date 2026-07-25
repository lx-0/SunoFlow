import { prisma } from "@/lib/prisma";

/** How many examples of each kind to feed the optimizer. Enough to establish a
 *  direction, few enough that one outlier cannot dominate the prompt. */
const MAX_EXAMPLES = 8;

export interface JamSessionSignal {
  /** Prompts whose song actually got played tonight — what is landing. */
  landed: string[];
  /** Prompts the host vetoed — what to steer away from. */
  rejected: string[];
}

export function hasJamSessionSignal(signal: JamSessionSignal): boolean {
  return signal.landed.length > 0 || signal.rejected.length > 0;
}

/**
 * What this party has reacted to so far, read entirely from data the session
 * already produces — no new tables, no tracking added.
 *
 * "Landed" is deliberately playback and not merely "generated successfully":
 * every accepted prompt reaches ready, so ready alone carries no preference
 * information. A song that was actually played is the closest thing to a vote
 * the room casts. "Rejected" is the host's explicit veto, the only unambiguous
 * negative available — a failed generation is an upstream problem, not taste,
 * and is excluded on purpose.
 */
export async function getJamSessionSignal(
  sessionId: string,
  hostUserId: string,
): Promise<JamSessionSignal> {
  const entries = await prisma.jamSessionEntry.findMany({
    where: { sessionId, songId: { not: null } },
    select: { promptText: true, status: true, songId: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const rejected = entries
    .filter((e) => e.status === "vetoed")
    .map((e) => e.promptText)
    .slice(0, MAX_EXAMPLES);

  const candidateIds = entries
    .filter((e) => e.status === "ready" && e.songId)
    .map((e) => e.songId as string);
  if (candidateIds.length === 0) return { landed: [], rejected };

  // Playback runs through the host's account (the party plays on their queue),
  // so their PlayHistory is where the room's reaction is recorded.
  const played = await prisma.playHistory.findMany({
    where: { userId: hostUserId, songId: { in: candidateIds } },
    select: { songId: true },
    distinct: ["songId"],
  });
  const playedIds = new Set(played.map((p) => p.songId));

  const landed = entries
    .filter((e) => e.songId && playedIds.has(e.songId))
    .map((e) => e.promptText)
    .slice(0, MAX_EXAMPLES);

  return { landed, rejected };
}
