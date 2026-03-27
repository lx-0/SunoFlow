import { prisma } from "@/lib/prisma";
import { cosineSimilarity, computeCentroid } from "@/lib/embeddings";
import { logger } from "@/lib/logger";

export type SmartPlaylistType = "top_hits" | "new_this_week" | "mood" | "similar_to";

// How many songs to populate each smart playlist with
const SMART_PLAYLIST_SIZE = 25;

// Refresh thresholds
const DAILY_REFRESH_MS = 24 * 60 * 60 * 1000;
const WEEKLY_REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function refreshThreshold(type: SmartPlaylistType): number {
  return type === "top_hits" || type === "similar_to" ? WEEKLY_REFRESH_MS : DAILY_REFRESH_MS;
}

/** Returns song IDs for the "Your Top Hits" playlist: most-played in the last 30 days */
async function computeTopHits(userId: string): Promise<string[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const rows = await prisma.playHistory.groupBy({
    by: ["songId"],
    where: { userId, playedAt: { gte: since } },
    _count: { songId: true },
    orderBy: { _count: { songId: "desc" } },
    take: SMART_PLAYLIST_SIZE,
  });

  if (rows.length === 0) {
    // Fall back to most-played overall
    const fallback = await prisma.song.findMany({
      where: { userId, generationStatus: "ready", archivedAt: null },
      orderBy: { playCount: "desc" },
      take: SMART_PLAYLIST_SIZE,
      select: { id: true },
    });
    return fallback.map((s) => s.id);
  }

  return rows.map((r) => r.songId);
}

/** Returns song IDs for "New This Week": songs added to the catalog in the last 7 days */
async function computeNewThisWeek(userId: string): Promise<string[]> {
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const songs = await prisma.song.findMany({
    where: {
      userId,
      generationStatus: "ready",
      archivedAt: null,
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: SMART_PLAYLIST_SIZE,
    select: { id: true },
  });
  return songs.map((s) => s.id);
}

/** Returns song IDs for a mood playlist: songs whose tags contain the mood keyword */
async function computeMood(userId: string, mood: string): Promise<string[]> {
  const songs = await prisma.song.findMany({
    where: {
      userId,
      generationStatus: "ready",
      archivedAt: null,
      tags: { contains: mood, mode: "insensitive" },
    },
    orderBy: { playCount: "desc" },
    take: SMART_PLAYLIST_SIZE,
    select: { id: true },
  });
  return songs.map((s) => s.id);
}

/** Returns song IDs for "Similar to [song]": uses cosine similarity on embeddings */
async function computeSimilarTo(
  userId: string,
  sourceSongId: string
): Promise<string[]> {
  const sourceEmb = await prisma.songEmbedding.findUnique({
    where: { songId: sourceSongId },
    select: { embedding: true },
  });

  if (!sourceEmb) {
    // No embedding yet — return empty; will populate on next refresh once embedding exists
    return [];
  }

  const queryVector = computeCentroid([sourceEmb.embedding as unknown as number[]]);
  if (!queryVector) return [];

  const candidates = await prisma.songEmbedding.findMany({
    where: {
      song: { userId, generationStatus: "ready", archivedAt: null },
      songId: { not: sourceSongId },
    },
    select: { songId: true, embedding: true },
    take: 500,
  });

  const scored = candidates
    .map((c) => ({
      songId: c.songId,
      score: cosineSimilarity(queryVector, c.embedding as unknown as number[]),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, SMART_PLAYLIST_SIZE);

  return scored.map((s) => s.songId);
}

/** Compute the song IDs for a given smart playlist */
export async function computeSmartPlaylistSongs(
  userId: string,
  type: SmartPlaylistType,
  meta: Record<string, string> | null
): Promise<string[]> {
  switch (type) {
    case "top_hits":
      return computeTopHits(userId);
    case "new_this_week":
      return computeNewThisWeek(userId);
    case "mood": {
      const mood = meta?.mood ?? "chill";
      return computeMood(userId, mood);
    }
    case "similar_to": {
      const sourceSongId = meta?.sourceSongId;
      if (!sourceSongId) return [];
      return computeSimilarTo(userId, sourceSongId);
    }
    default:
      return [];
  }
}

/** Replace the songs in a smart playlist with the freshly computed list */
export async function refreshSmartPlaylist(playlistId: string): Promise<void> {
  const playlist = await prisma.playlist.findUnique({
    where: { id: playlistId },
    select: {
      id: true,
      userId: true,
      isSmartPlaylist: true,
      smartPlaylistType: true,
      smartPlaylistMeta: true,
    },
  });

  if (!playlist?.isSmartPlaylist || !playlist.smartPlaylistType) return;

  const songIds = await computeSmartPlaylistSongs(
    playlist.userId,
    playlist.smartPlaylistType as SmartPlaylistType,
    playlist.smartPlaylistMeta as Record<string, string> | null
  );

  // Replace all PlaylistSong rows atomically
  await prisma.$transaction([
    prisma.playlistSong.deleteMany({ where: { playlistId } }),
    ...(songIds.length > 0
      ? [
          prisma.playlistSong.createMany({
            data: songIds.map((songId, idx) => ({
              playlistId,
              songId,
              position: idx,
              addedByUserId: null,
            })),
            skipDuplicates: true,
          }),
        ]
      : []),
    prisma.playlist.update({
      where: { id: playlistId },
      data: { smartRefreshedAt: new Date() },
    }),
  ]);

  logger.info({ playlistId, type: playlist.smartPlaylistType, count: songIds.length }, "smart-playlists: refreshed");
}

/**
 * Ensure a user has all their default smart playlists created.
 * Creates any missing ones; does not duplicate existing ones.
 */
export async function ensureDefaultSmartPlaylists(userId: string): Promise<void> {
  const defaults: Array<{
    type: SmartPlaylistType;
    name: string;
    description: string;
    meta: Record<string, string> | null;
  }> = [
    {
      type: "top_hits",
      name: "Your Top Hits",
      description: "Your most-played songs from the last 30 days",
      meta: null,
    },
    {
      type: "new_this_week",
      name: "New This Week",
      description: "Songs you created in the last 7 days",
      meta: null,
    },
    {
      type: "mood",
      name: "Mood: Chill",
      description: "Songs tagged with a chill vibe",
      meta: { mood: "chill" },
    },
  ];

  const existing = await prisma.playlist.findMany({
    where: { userId, isSmartPlaylist: true },
    select: { smartPlaylistType: true, smartPlaylistMeta: true },
  });

  const existingKeys = new Set(
    existing.map((p) => {
      const meta = p.smartPlaylistMeta as Record<string, string> | null;
      return `${p.smartPlaylistType}:${meta?.mood ?? meta?.sourceSongId ?? ""}`;
    })
  );

  for (const def of defaults) {
    const key = `${def.type}:${def.meta?.mood ?? def.meta?.sourceSongId ?? ""}`;
    if (existingKeys.has(key)) continue;

    const playlist = await prisma.playlist.create({
      data: {
        userId,
        name: def.name,
        description: def.description,
        isSmartPlaylist: true,
        smartPlaylistType: def.type,
        smartPlaylistMeta: def.meta ?? undefined,
      },
    });

    // Populate immediately on creation
    await refreshSmartPlaylist(playlist.id);
  }
}

/**
 * Refresh all stale smart playlists across all users.
 * Called by the cron job.
 */
export async function refreshStalePlaylists(): Promise<{ refreshed: number; skipped: number }> {
  const playlists = await prisma.playlist.findMany({
    where: { isSmartPlaylist: true },
    select: {
      id: true,
      smartPlaylistType: true,
      smartRefreshedAt: true,
    },
  });

  let refreshed = 0;
  let skipped = 0;

  for (const pl of playlists) {
    const type = pl.smartPlaylistType as SmartPlaylistType;
    const threshold = refreshThreshold(type);
    const lastRefresh = pl.smartRefreshedAt?.getTime() ?? 0;
    const stale = Date.now() - lastRefresh > threshold;

    if (!stale) {
      skipped++;
      continue;
    }

    try {
      await refreshSmartPlaylist(pl.id);
      refreshed++;
    } catch (err) {
      logger.error({ err, playlistId: pl.id }, "smart-playlists: refresh failed");
    }
  }

  return { refreshed, skipped };
}
