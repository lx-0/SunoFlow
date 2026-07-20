import { prisma } from "@/lib/prisma";
import { type Result, success, Err } from "@/lib/result";
import { acquireAnonRateLimitSlot } from "@/lib/rate-limit";

// Per-IP burst cap across all songs — blunts scripted floods that spam
// SongView rows / inflate viewCount (the route is public + unauthenticated).
const VIEW_IP_LIMIT = 60;
const VIEW_IP_WINDOW_MS = 60 * 1000; // 60 views/minute per IP

// Per-IP + per-song dedup — only the first view of a given song from a given
// IP within the window is actually counted; replays are acknowledged but not
// double-counted. Preserves a single legitimate view per viewer.
const VIEW_DEDUP_LIMIT = 1;
const VIEW_DEDUP_WINDOW_MS = 30 * 60 * 1000; // 30 minutes

export interface PlayResult {
  ok: true;
  eventId?: string;
  skipped?: boolean;
}

export async function recordPlay(
  userId: string,
  songId: string,
  durationSec: unknown,
): Promise<Result<PlayResult>> {
  if (!songId || typeof songId !== "string") {
    return Err.validation("songId is required");
  }

  const song = await prisma.song.findFirst({
    where: {
      id: songId,
      OR: [{ userId }, { isPublic: true }],
    },
    select: { id: true, userId: true },
  });

  if (!song) return Err.notFound("Song not found");

  if (song.userId === userId) {
    return success({ ok: true, skipped: true });
  }

  const [event] = await prisma.$transaction([
    prisma.playEvent.create({
      data: {
        songId,
        listenerId: userId,
        durationSec: typeof durationSec === "number" ? durationSec : null,
      },
    }),
    prisma.song.update({
      where: { id: songId },
      data: { playCount: { increment: 1 } },
    }),
  ]);

  return success({ ok: true, eventId: event.id });
}

export async function recordView(
  songId: string,
  ip = "unknown",
): Promise<Result<{ ok: true }>> {
  if (!songId || typeof songId !== "string") {
    return Err.validation("songId is required");
  }

  // 1) Per-IP burst cap — reject scripted floods before any DB lookup/writes.
  const ipSlot = await acquireAnonRateLimitSlot(
    ip,
    "view",
    VIEW_IP_LIMIT,
    VIEW_IP_WINDOW_MS,
  );
  if (!ipSlot.acquired) {
    return Err.rateLimited("Too many view events. Please try again later.");
  }

  const song = await prisma.song.findFirst({
    where: { id: songId, isPublic: true, isHidden: false, archivedAt: null },
    select: { id: true },
  });

  if (!song) return Err.notFound("Song not found");

  // 2) Per-IP + per-song dedup — count only the first view within the window.
  // A replay from the same viewer is acknowledged (ok) but not counted.
  const dedupSlot = await acquireAnonRateLimitSlot(
    `${ip}:${songId}`,
    "view_dedup",
    VIEW_DEDUP_LIMIT,
    VIEW_DEDUP_WINDOW_MS,
  );
  if (!dedupSlot.acquired) {
    return success({ ok: true });
  }

  await prisma.$transaction([
    prisma.songView.create({ data: { songId } }),
    prisma.song.update({
      where: { id: songId },
      data: { viewCount: { increment: 1 } },
    }),
  ]);

  return success({ ok: true });
}
