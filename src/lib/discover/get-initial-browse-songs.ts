import { cached, cacheKey, CacheTTL } from "@/lib/cache";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

const BASE_WHERE = {
  isPublic: true,
  isHidden: false,
  archivedAt: null as null,
  generationStatus: "ready" as const,
};

export async function getInitialBrowseSongs() {
  const key = cacheKey("discover", "newest", "all", "any", "0", "999", "1");
  const { songs, total } = await cached(
    key,
    async () => {
      const [results, count] = await Promise.all([
        prisma.song.findMany({
          where: BASE_WHERE,
          orderBy: { createdAt: "desc" },
          take: PAGE_SIZE,
          select: {
            id: true,
            title: true,
            tags: true,
            imageUrl: true,
            audioUrl: true,
            duration: true,
            rating: true,
            playCount: true,
            publicSlug: true,
            createdAt: true,
            user: { select: { id: true, name: true, username: true } },
          },
        }),
        prisma.song.count({ where: BASE_WHERE }),
      ]);
      return { songs: results, total: count };
    },
    CacheTTL.DISCOVER
  );

  const totalPages = Math.ceil(total / PAGE_SIZE);
  return {
    songs: songs.map((s) => ({ ...s, createdAt: s.createdAt.toISOString() })),
    pagination: { page: 1, totalPages, total, hasMore: totalPages > 1 },
  };
}
