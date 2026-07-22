import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Jam side of the song-completion seam: when a generation reaches a terminal
 * state, sync the session entry and (on success) append the song to the
 * session playlist. The entry flipping to "ready" is the host page's signal
 * to enqueue the song into the running party queue (S02 polls for it).
 *
 * No-op for non-jam songs (one indexed lookup). Vetoed entries stay vetoed —
 * their songs never join the playlist.
 */
export async function syncJamEntryOnCompletion(
  songId: string,
  outcome: "ready" | "failed",
): Promise<void> {
  const entry = await prisma.jamSessionEntry.findUnique({
    where: { songId },
    select: {
      id: true,
      status: true,
      session: { select: { playlistId: true } },
    },
  });
  if (!entry || entry.status !== "pending") return;

  if (outcome === "failed") {
    await prisma.jamSessionEntry.update({
      where: { id: entry.id },
      data: { status: "failed" },
    });
    return;
  }

  const playlistId = entry.session.playlistId;
  try {
    await prisma.playlistSong.create({
      data: {
        playlistId,
        songId,
        position: await prisma.playlistSong.count({ where: { playlistId } }),
      },
    });
  } catch (error) {
    // P2002 = already in the playlist (concurrent completion handlers race
    // here; the @@unique([playlistId, songId]) constraint is the guard).
    if (
      !(error instanceof Prisma.PrismaClientKnownRequestError) ||
      error.code !== "P2002"
    ) {
      throw error;
    }
  }

  await prisma.jamSessionEntry.update({
    where: { id: entry.id },
    data: { status: "ready" },
  });
}
