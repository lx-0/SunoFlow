import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { logServerError } from "@/lib/error-logger";
import { CacheControl } from "@/lib/cache";
import { internalError } from "@/lib/api-error";

/**
 * GET /api/radio
 *
 * Returns a shuffled set of songs matching the given mood/genre/tempo criteria,
 * drawing from the authenticated user's library and public songs.
 *
 * Query params:
 *   mood        — mood tag (e.g. "chill", "energetic")
 *   genre       — genre tag (e.g. "pop", "jazz")
 *   tempoMin    — minimum BPM
 *   tempoMax    — maximum BPM
 *   excludeIds  — comma-separated song IDs to exclude (recently played / thumbs-downed)
 *   seedSongId  — song ID to derive criteria from ("play more like this")
 *   limit       — number of songs to return (default 20, max 50)
 */
export async function GET(request: NextRequest) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const params = request.nextUrl.searchParams;

    let mood = params.get("mood")?.trim().toLowerCase() || "";
    let genre = params.get("genre")?.trim().toLowerCase() || "";
    const tempoMinParam = parseInt(params.get("tempoMin") || "", 10);
    const tempoMaxParam = parseInt(params.get("tempoMax") || "", 10);
    const excludeIdsParam = params.get("excludeIds") || "";
    const seedSongId = params.get("seedSongId")?.trim() || "";
    const limitParam = parseInt(params.get("limit") || "", 10);
    const limit = !isNaN(limitParam) && limitParam >= 1 && limitParam <= 50 ? limitParam : 20;

    const excludeIds = excludeIdsParam
      ? excludeIdsParam.split(",").map((id) => id.trim()).filter(Boolean)
      : [];

    // If a seed song is provided, derive mood/genre from its tags
    if (seedSongId && (!mood && !genre)) {
      const seed = await prisma.song.findFirst({
        where: {
          id: seedSongId,
          OR: [{ userId }, { isPublic: true }],
          generationStatus: "ready",
        },
        select: { tags: true },
      });
      if (seed?.tags) {
        const tagParts = seed.tags
          .split(/[,;\s]+/)
          .map((t) => t.trim().toLowerCase())
          .filter(Boolean);
        // Pick first recognizable mood keyword from the seed song's tags
        const MOOD_KEYWORDS = new Set([
          "energetic", "chill", "dark", "uplifting", "melancholic", "aggressive",
          "relaxed", "happy", "sad", "epic", "dreamy", "intense", "romantic",
          "mysterious", "peaceful", "angry", "nostalgic", "euphoric", "somber",
          "atmospheric", "hypnotic", "groovy", "emotional", "powerful", "calm",
          "experimental",
        ]);
        mood = tagParts.find((t) => MOOD_KEYWORDS.has(t)) || "";
        // Use remaining non-mood tag as genre hint
        genre = tagParts.find((t) => !MOOD_KEYWORDS.has(t) && t.length > 2) || "";
      }
    }

    // Build tag-matching filter helper
    function buildTagFilter(m: string, g: string): Prisma.SongWhereInput {
      const conditions: Prisma.SongWhereInput[] = [];
      if (m) conditions.push({ tags: { contains: m, mode: "insensitive" } });
      if (g) conditions.push({ tags: { contains: g, mode: "insensitive" } });
      if (conditions.length === 0) return {};
      if (conditions.length === 1) return conditions[0];
      return { AND: conditions };
    }

    // Build tempo filter
    const tempoFilter: Prisma.IntNullableFilter | undefined =
      (!isNaN(tempoMinParam) && tempoMinParam > 0) ||
      (!isNaN(tempoMaxParam) && tempoMaxParam > 0)
        ? {
            ...((!isNaN(tempoMinParam) && tempoMinParam > 0) ? { gte: tempoMinParam } : {}),
            ...((!isNaN(tempoMaxParam) && tempoMaxParam > 0) ? { lte: tempoMaxParam } : {}),
          }
        : undefined;

    const tagFilter = buildTagFilter(mood, genre);

    // Base conditions shared between user and public queries
    const baseConditions: Prisma.SongWhereInput = {
      generationStatus: "ready",
      audioUrl: { not: null },
      archivedAt: null,
      ...(excludeIds.length > 0 ? { id: { notIn: excludeIds } } : {}),
      ...(tempoFilter ? { tempo: tempoFilter } : {}),
      ...tagFilter,
    };

    // Fetch from user's own library
    const userSongsPromise = prisma.song.findMany({
      where: {
        ...baseConditions,
        userId,
        isHidden: false,
      },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        imageUrl: true,
        duration: true,
        lyrics: true,
        tags: true,
      },
      take: 60,
    });

    // Fetch from public songs (other users)
    const publicSongsPromise = prisma.song.findMany({
      where: {
        ...baseConditions,
        isPublic: true,
        isHidden: false,
        userId: { not: userId }, // avoid duplicating user's own public songs
      },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        imageUrl: true,
        duration: true,
        lyrics: true,
        tags: true,
      },
      take: 60,
      orderBy: { playCount: "desc" }, // favour popular songs from public pool
    });

    const [userSongs, publicSongs] = await Promise.all([
      userSongsPromise,
      publicSongsPromise,
    ]);

    // Merge, deduplicate, shuffle with Fisher-Yates
    const seen = new Set<string>();
    const merged: typeof userSongs = [];
    for (const s of [...userSongs, ...publicSongs]) {
      if (!seen.has(s.id) && s.audioUrl) {
        seen.add(s.id);
        merged.push(s);
      }
    }

    // Fisher-Yates shuffle
    for (let i = merged.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [merged[i], merged[j]] = [merged[j], merged[i]];
    }

    const results = merged.slice(0, limit).map((s) => ({
      id: s.id,
      title: s.title,
      audioUrl: s.audioUrl!,
      imageUrl: s.imageUrl,
      duration: s.duration,
      lyrics: s.lyrics,
    }));

    return NextResponse.json(
      { songs: results, mood: mood || null, genre: genre || null, total: results.length },
      { headers: { "Cache-Control": CacheControl.privateNoCache } }
    );
  } catch (error) {
    logServerError("radio", error, { route: "/api/radio" });
    return internalError();
  }
}
