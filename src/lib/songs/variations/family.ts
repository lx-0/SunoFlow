import { prisma } from "@/lib/prisma";
import { type Result, success, Err } from "@/lib/result";
import { MAX_VARIATIONS } from "@/lib/songs/variations/constants";
import { resolveRootId } from "@/lib/songs/variations/parent-context";
import { VARIATION_SELECT, toVariationRow } from "@/lib/songs/variations/projection";
import type { VariationFamily } from "@/lib/songs/variations/types";

export async function getVariationFamily(userId: string, songId: string): Promise<Result<VariationFamily>> {
  const song = await prisma.song.findUnique({ where: { id: songId } });
  if (!song || song.userId !== userId) return Err.notFound("Song not found");

  const rootId = await resolveRootId(songId, song.parentSongId);

  const root = rootId === songId
    ? song
    : await prisma.song.findUnique({ where: { id: rootId } });

  const variations = await prisma.song.findMany({
    where: { parentSongId: rootId },
    orderBy: { createdAt: "asc" },
    select: VARIATION_SELECT,
  });

  return success({
    root: root ? toVariationRow(root) : null,
    variations,
    variationCount: variations.length,
    maxVariations: MAX_VARIATIONS,
  });
}
