import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logServerError } from "@/lib/error-logger";
import { CacheControl, CacheTTL, cached, cacheKey } from "@/lib/cache";
import { rateLimited } from "@/lib/api-error";

// In-memory IP rate limiter — 100 req/min for unauthenticated public endpoint
const ipHits = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = ipHits.get(ip);

  if (!entry || now > entry.resetAt) {
    ipHits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

export async function GET(request: NextRequest) {
  try {
    // Rate limit by IP
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    if (isRateLimited(ip)) {
      return rateLimited("Too many requests. Try again in a minute.", undefined, {
        "Retry-After": "60",
      });
    }

    const params = request.nextUrl.searchParams;

    // Pagination (offset-based)
    const limitParam = parseInt(params.get("limit") || "", 10);
    const limit = !isNaN(limitParam) && limitParam >= 1 && limitParam <= 100 ? limitParam : 20;
    const offsetParam = parseInt(params.get("offset") || "", 10);
    const offset = !isNaN(offsetParam) && offsetParam >= 0 ? offsetParam : 0;

    // Filters
    const q = params.get("q")?.trim() || "";
    const genre = params.get("genre")?.trim() || "";
    const mood = params.get("mood")?.trim() || "";
    const sort = params.get("sort") || "newest";

    // Base WHERE: public, not hidden, not archived, generation complete
    const where: Prisma.SongWhereInput = {
      isPublic: true,
      isHidden: false,
      archivedAt: null,
      generationStatus: "ready",
    };

    // For trending, restrict to songs from the last 30 days
    if (sort === "trending") {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      where.createdAt = { gte: thirtyDaysAgo };
    }

    // Full-text search: match title, tags, or lyrics (simple ILIKE)
    if (q) {
      where.OR = [
        { title: { contains: q, mode: "insensitive" } },
        { tags: { contains: q, mode: "insensitive" } },
        { lyrics: { contains: q, mode: "insensitive" } },
      ];
    }

    // Genre filter (ILIKE on tags field)
    if (genre && mood) {
      where.AND = [
        { tags: { contains: genre, mode: "insensitive" } },
        { tags: { contains: mood, mode: "insensitive" } },
      ];
    } else if (genre) {
      where.tags = { contains: genre, mode: "insensitive" };
    } else if (mood) {
      where.tags = { contains: mood, mode: "insensitive" };
    }

    // Build ORDER BY
    let orderBy: Prisma.SongOrderByWithRelationInput;
    switch (sort) {
      case "popular":
        orderBy = { playCount: "desc" };
        break;
      case "trending":
        // Most played within the last 30 days (time window already applied in WHERE)
        orderBy = { playCount: "desc" };
        break;
      case "newest":
      default:
        orderBy = { createdAt: "desc" };
        break;
    }

    const key = cacheKey(
      "public-songs",
      q || "all",
      genre || "any",
      mood || "any",
      sort,
      String(limit),
      String(offset)
    );

    const { songs, total } = await cached(
      key,
      async () => {
        const [results, count] = await Promise.all([
          prisma.song.findMany({
            where,
            orderBy,
            skip: offset,
            take: limit,
            select: {
              id: true,
              title: true,
              tags: true,
              imageUrl: true,
              playCount: true,
              createdAt: true,
              user: {
                select: {
                  name: true,
                  username: true,
                },
              },
            },
          }),
          prisma.song.count({ where }),
        ]);
        return { songs: results, total: count };
      },
      CacheTTL.PUBLIC_SONG
    );

    // Shape the response — no private user data
    const shaped = songs.map((s) => ({
      id: s.id,
      title: s.title,
      creatorDisplayName: s.user.name || s.user.username || "Anonymous",
      albumArtUrl: s.imageUrl,
      genre: s.tags || null,
      mood: s.tags || null,
      playCount: s.playCount,
      createdAt: s.createdAt,
    }));

    return NextResponse.json(
      {
        songs: shaped,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
      {
        headers: { "Cache-Control": CacheControl.publicShort },
      }
    );
  } catch (error) {
    logServerError("songs-public", error, { route: "/api/songs/public" });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
