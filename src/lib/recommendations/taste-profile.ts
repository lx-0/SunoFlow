import { prisma } from "@/lib/prisma";
import { gatherUserSignals } from "@/lib/user-signals";
import { computeCentroid } from "@/lib/embeddings";

const SIGNAL_SONGS_LIMIT = 30;

export async function gatherSignalIds(userId: string): Promise<Set<string>> {
  const [signals, recentGenerated] = await Promise.all([
    gatherUserSignals(userId, { limit: SIGNAL_SONGS_LIMIT }),
    prisma.song.findMany({
      where: { userId, generationStatus: "ready", archivedAt: null },
      select: { id: true },
      orderBy: { createdAt: "desc" },
      take: SIGNAL_SONGS_LIMIT,
    }),
  ]);

  for (const s of recentGenerated) {
    signals.songIds.add(s.id);
  }

  return signals.songIds;
}

function parseEmbeddingVector(raw: unknown): number[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  return raw as number[];
}

export async function computeTasteProfile(signalIds: Set<string>): Promise<number[] | null> {
  if (signalIds.size === 0) return null;

  const signalEmbeddings = await prisma.songEmbedding.findMany({
    where: { songId: { in: Array.from(signalIds) } },
    select: { embedding: true },
  });

  const vectors = signalEmbeddings
    .map((e) => parseEmbeddingVector(e.embedding))
    .filter((v): v is number[] => v !== null);

  return computeCentroid(vectors);
}

export { parseEmbeddingVector };
