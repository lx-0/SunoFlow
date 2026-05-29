import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { trendingScore } from "@/lib/feed/rank";
import { cached, cacheKey, CacheTTL } from "@/lib/cache";
import type { DiscoverPlaylistsQuery } from "./request";
import { asIsoDate, paginationMeta, TRENDING_POOL_SIZE, trendingCutoff } from "./shared";

const PLAYLIST_DISCOVER_SELECT = {
  id: true,
  name: true,
  description: true,
  genre: true,
  slug: true,
  publishedAt: true,
  playCount: true,
  shareCount: true,
  createdAt: true,
  user: { select: { id: true, name: true, username: true } },
  _count: {
    select: { songs: { where: { song: { archivedAt: null } } } },
  },
} as const;

type PlaylistDiscoverRow = Prisma.PlaylistGetPayload<{
  select: typeof PLAYLIST_DISCOVER_SELECT;
}>;

function formatPlaylist(p: PlaylistDiscoverRow) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    genre: p.genre,
    slug: p.slug,
    songCount: p._count.songs,
    publishedAt: asIsoDate(p.publishedAt),
    playCount: p.playCount,
    createdAt: asIsoDate(p.createdAt),
    creatorDisplayName: p.user.name || p.user.username || "Anonymous",
    creatorUsername: p.user.username || null,
  };
}

export async function discoverPlaylists(q: DiscoverPlaylistsQuery) {
  const skip = (q.page - 1) * q.limit;

  const key = cacheKey(
    "playlist-discover-v1",
    q.sort,
    q.genre || "any",
    String(q.page),
    String(q.limit),
  );

  const result = await cached(
    key,
    async () => {
      const baseWhere: Prisma.PlaylistWhereInput = { isPublished: true };
      if (q.genre) {
        baseWhere.genre = { contains: q.genre, mode: "insensitive" };
      }

      if (q.sort === "trending") {
        const trendingWhere: Prisma.PlaylistWhereInput = {
          ...baseWhere,
          publishedAt: { gte: trendingCutoff() },
        };

        const [pool, count] = await Promise.all([
          prisma.playlist.findMany({
            where: trendingWhere,
            orderBy: { playCount: "desc" },
            take: TRENDING_POOL_SIZE,
            select: PLAYLIST_DISCOVER_SELECT,
          }),
          prisma.playlist.count({ where: trendingWhere }),
        ]);

        const scored = pool
          .map((p) => ({
            ...formatPlaylist(p),
            score: trendingScore(p.playCount, p.shareCount, p.publishedAt!),
          }))
          .sort((a, b) => b.score - a.score);

        return { playlists: scored.slice(skip, skip + q.limit), total: count };
      }

      const orderBy: Prisma.PlaylistOrderByWithRelationInput =
        q.sort === "popular" ? { playCount: "desc" } : { publishedAt: "desc" };

      const [playlists, count] = await Promise.all([
        prisma.playlist.findMany({
          where: baseWhere,
          orderBy,
          skip,
          take: q.limit,
          select: PLAYLIST_DISCOVER_SELECT,
        }),
        prisma.playlist.count({ where: baseWhere }),
      ]);

      return { playlists: playlists.map(formatPlaylist), total: count };
    },
    CacheTTL.DISCOVER,
  );

  return {
    playlists: result.playlists,
    sort: q.sort,
    pagination: paginationMeta(q.page, q.limit, result.total),
  };
}
