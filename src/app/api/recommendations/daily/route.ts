import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/error-logger";
import { cached, cacheKey, CacheTTL } from "@/lib/cache";

const DAILY_LIMIT = 20;
const TOP_RATED_COUNT = 7;
const GENRE_MATCH_COUNT = 8;
const EXPLORATION_COUNT = 5;

function parseTags(tagsStr: string | null): string[] {
  if (!tagsStr) return [];
  return tagsStr
    .split(",")
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);
}

/** Shuffle an array with Fisher-Yates, seeded by a string (for deterministic daily results) */
function seededShuffle<T>(arr: T[], seed: string): T[] {
  const copy = [...arr];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0;
  }
  for (let i = copy.length - 1; i > 0; i--) {
    hash = (Math.imul(hash, 1664525) + 1013904223) | 0;
    const j = Math.abs(hash) % (i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export async function GET(request: NextRequest) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    // TTL bucket: 1 hour
    const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = cacheKey("daily-recommendations", userId, String(hourBucket));

    const result = await cached(
      key,
      async () => {
        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { preferredGenres: true },
        });
        const preferredGenres = (user?.preferredGenres ?? []).map((g) => g.toLowerCase());

        const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD for seeded shuffle

        // 1. Top-rated recent songs (last 60 days)
        const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000);
        const topRated = await prisma.song.findMany({
          where: {
            userId,
            archivedAt: null,
            generationStatus: "ready",
            rating: { gte: 4 },
            createdAt: { gte: sixtyDaysAgo },
          },
          orderBy: [{ rating: "desc" }, { createdAt: "desc" }],
          take: TOP_RATED_COUNT * 3,
          select: {
            id: true,
            title: true,
            tags: true,
            imageUrl: true,
            duration: true,
            audioUrl: true,
            createdAt: true,
            rating: true,
          },
        });

        // 2. Genre-matched songs based on user preferred genres and recent favorites
        let genrePool: typeof topRated = [];
        const genreTokensToMatch = [...preferredGenres];

        // Also pull tokens from recently favorited songs
        if (genreTokensToMatch.length === 0) {
          const recentFavorites = await prisma.favorite.findMany({
            where: { userId },
            include: { song: { select: { tags: true } } },
            orderBy: { createdAt: "desc" },
            take: 10,
          });
          for (const fav of recentFavorites) {
            genreTokensToMatch.push(...parseTags(fav.song.tags));
          }
        }

        if (genreTokensToMatch.length > 0) {
          const genreSet = new Set(genreTokensToMatch.slice(0, 20));
          const genreCandidates = await prisma.song.findMany({
            where: {
              userId,
              archivedAt: null,
              generationStatus: "ready",
              id: { notIn: topRated.map((s) => s.id) },
            },
            orderBy: { createdAt: "desc" },
            take: 100,
            select: {
              id: true,
              title: true,
              tags: true,
              imageUrl: true,
              duration: true,
              audioUrl: true,
              createdAt: true,
              rating: true,
            },
          });

          genrePool = seededShuffle(
            genreCandidates.filter((s) => {
              const songTokens = parseTags(s.tags);
              return songTokens.some((t) => genreSet.has(t));
            }),
            today
          ).slice(0, GENRE_MATCH_COUNT * 2);
        }

        // 3. Random exploration (songs not already included)
        const excludeIds = new Set([
          ...topRated.map((s) => s.id),
          ...genrePool.map((s) => s.id),
        ]);

        const explorationCandidates = await prisma.song.findMany({
          where: {
            userId,
            archivedAt: null,
            generationStatus: "ready",
            id: { notIn: Array.from(excludeIds) },
          },
          orderBy: { playCount: "asc" }, // prefer less-played songs for discovery
          take: EXPLORATION_COUNT * 3,
          select: {
            id: true,
            title: true,
            tags: true,
            imageUrl: true,
            duration: true,
            audioUrl: true,
            createdAt: true,
            rating: true,
          },
        });

        const explorationPool = seededShuffle(explorationCandidates, today).slice(
          0,
          EXPLORATION_COUNT
        );

        // Combine and deduplicate
        const allSeen = new Set<string>();
        const playlist: typeof topRated = [];

        for (const s of [
          ...seededShuffle(topRated, today).slice(0, TOP_RATED_COUNT),
          ...seededShuffle(genrePool, today).slice(0, GENRE_MATCH_COUNT),
          ...explorationPool,
        ]) {
          if (!allSeen.has(s.id) && playlist.length < DAILY_LIMIT) {
            allSeen.add(s.id);
            playlist.push(s);
          }
        }

        return {
          songs: playlist.map((s) => ({
            id: s.id,
            title: s.title,
            tags: s.tags,
            imageUrl: s.imageUrl,
            duration: s.duration,
            audioUrl: s.audioUrl,
            createdAt: s.createdAt.toISOString(),
            rating: s.rating,
          })),
          total: playlist.length,
          generatedAt: new Date().toISOString(),
        };
      },
      CacheTTL.RECOMMENDATIONS
    );

    return NextResponse.json(result);
  } catch (error) {
    logServerError("daily-recommendations", error, { route: "/api/recommendations/daily" });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
