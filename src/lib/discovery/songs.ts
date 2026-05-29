import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import {
  DEFAULT_PAGE_SIZE,
  offsetWindowPagination,
  pageSkip,
} from "@/lib/pagination";
import { buildDiscoverableFilter, SongSelect } from "@/lib/songs";
import { trendingScore } from "@/lib/feed/rank";
import { cached, cacheKey, CacheTTL } from "@/lib/cache";
import type { DiscoverSongsQuery } from "./request";
import { asIsoDate, TRENDING_POOL_SIZE, trendingCutoff, paginationMeta } from "./shared";

export interface TrendingSongsQuery {
  sort: "trending" | "popular";
  genre?: string;
  mood?: string;
  limit: number;
  offset: number;
}

type SongPublicRow = Prisma.SongGetPayload<{
  select: typeof SongSelect.public;
}>;

function formatTrendingSong(s: SongPublicRow, score: number) {
  return {
    id: s.id,
    title: s.title,
    genre: s.tags || null,
    albumArtUrl: s.imageUrl,
    audioUrl: s.audioUrl,
    duration: s.duration,
    playCount: s.playCount,
    publicSlug: s.publicSlug,
    createdAt: asIsoDate(s.createdAt),
    score,
    creatorDisplayName: s.user.name || s.user.username || "Anonymous",
    creatorUsername: s.user.username || null,
  };
}

export async function trendingSongs(q: TrendingSongsQuery) {
  const key = cacheKey(
    "trending-v1",
    q.sort,
    q.genre || "any",
    q.mood || "any",
    String(q.limit),
    String(q.offset),
  );

  const { songs, total } = await cached(
    key,
    async () => {
      const baseWhere = buildDiscoverableFilter({ genre: q.genre, mood: q.mood });

      if (q.sort === "popular") {
        const [rows, count] = await Promise.all([
          prisma.song.findMany({
            where: baseWhere,
            orderBy: { playCount: "desc" },
            skip: q.offset,
            take: q.limit,
            select: SongSelect.public,
          }),
          prisma.song.count({ where: baseWhere }),
        ]);
        return {
          songs: rows.map((s) => formatTrendingSong(s, s.playCount)),
          total: count,
        };
      }

      const trendingWhere = {
        ...baseWhere,
        createdAt: { gte: trendingCutoff() },
      };

      const [pool, count] = await Promise.all([
        prisma.song.findMany({
          where: trendingWhere,
          orderBy: { playCount: "desc" },
          take: TRENDING_POOL_SIZE,
          select: SongSelect.public,
        }),
        prisma.song.count({ where: trendingWhere }),
      ]);

      const scored = pool
        .map((s) =>
          formatTrendingSong(s, trendingScore(s.playCount, s.downloadCount, s.createdAt)),
        )
        .sort((a, b) => b.score - a.score);

      return { songs: scored.slice(q.offset, q.offset + q.limit), total: count };
    },
    CacheTTL.RECOMMENDATIONS,
  );

  return {
    songs,
    sort: q.sort,
    pagination: offsetWindowPagination(q.offset, q.limit, total),
  };
}

export async function discoverSongs(q: DiscoverSongsQuery) {
  const skip = pageSkip(q.page, DEFAULT_PAGE_SIZE);

  const key = cacheKey(
    "discover",
    q.sortBy,
    q.tag || "all",
    q.mood || "any",
    q.tempoMin != null ? String(q.tempoMin) : "0",
    q.tempoMax != null ? String(q.tempoMax) : "999",
    String(q.page),
  );

  const { songs, total } = await cached(
    key,
    async () => {
      const where = buildDiscoverableFilter({
        genre: q.tag || undefined,
        mood: q.mood || undefined,
        tempoMin: q.tempoMin ?? undefined,
        tempoMax: q.tempoMax ?? undefined,
      });

      let orderBy: Prisma.SongOrderByWithRelationInput;
      switch (q.sortBy) {
        case "highest_rated":
          orderBy = { rating: { sort: "desc", nulls: "last" } };
          break;
        case "most_played":
          orderBy = { playCount: "desc" };
          break;
        case "newest":
        default:
          orderBy = { createdAt: "desc" };
          break;
      }

      const [results, count] = await Promise.all([
        prisma.song.findMany({
          where,
          orderBy,
          skip,
          take: DEFAULT_PAGE_SIZE,
          select: SongSelect.public,
        }),
        prisma.song.count({ where }),
      ]);

      return {
        songs: results.map((song) => ({
          ...song,
          createdAt: asIsoDate(song.createdAt),
        })),
        total: count,
      };
    },
    CacheTTL.DISCOVER,
  );

  return {
    songs,
    pagination: paginationMeta(q.page, DEFAULT_PAGE_SIZE, total),
  };
}

export async function getInitialBrowseSongs() {
  const { songs, pagination } = await discoverSongs({
    sortBy: "newest",
    page: 1,
  });

  return { songs, pagination };
}
