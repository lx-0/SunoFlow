import { Prisma } from "@prisma/client";
import { invalidateByPrefix } from "@/lib/cache";
import { CDN_URL_TTL_MS } from "@/lib/cdn-constants";
import { logServerError } from "@/lib/error-logger";
import { broadcast } from "@/lib/event-bus";
import { resolveBySongId } from "@/lib/generation-queue";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { syncJamEntryOnCompletion } from "@/lib/jam";
import { buildFailedTransition, readyTransition } from "@/lib/songs/lifecycle";
import {
  broadcastSongReady,
  cacheSongAssets,
  notifyAboutReadySong,
  recordSongReadyEngagement,
  type SongReadyContext,
} from "./song-ready-events";

const USER_CONTENT_REJECT_PATTERNS = [
  /artist name/i,
  /content policy/i,
  /please change your/i,
  /copyright/i,
];

function isUserContentReject(errorMessage: string): boolean {
  return USER_CONTENT_REJECT_PATTERNS.some((re) => re.test(errorMessage));
}

// ── Types ───────────────────────────────────────────────────────────

export interface CompletionSong {
  audioUrl?: string;
  imageUrl?: string;
  duration?: number;
  lyrics?: string;
  title?: string;
  tags?: string;
  model?: string;
  id?: string;
}

export interface SongRecord {
  id: string;
  userId: string;
  prompt: string | null;
  tags: string | null;
  audioUrl: string | null;
  audioUrlExpiresAt: Date | null;
  imageUrl: string | null;
  imageUrlExpiresAt: Date | null;
  duration: number | null;
  lyrics: string | null;
  title: string | null;
  sunoModel: string | null;
  isInstrumental: boolean;
  pollCount: number;
}

export interface PersistedSong {
  id: string;
  title: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
}

export interface AlternateSong {
  id: string;
  parentSongId: string;
  title: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  audioSource: CompletionSong;
}

// ── Public interface ────────────────────────────────────────────────

export interface CompletionResult {
  persisted: boolean;
  sideEffectErrors: string[];
}

export async function handleSongSuccess(
  song: SongRecord,
  completionSongs: CompletionSong[],
): Promise<CompletionResult> {
  if (completionSongs.length === 0) return { persisted: false, sideEffectErrors: [] };

  const firstSong = completionSongs[0];

  // Single-flight guard. Three pathways can call handleSongSuccess
  // concurrently for the same song: the SSE pollToCompletion loop, the
  // client-side `/api/songs/[id]/status` poll, and the stale-pending
  // recovery sweep. If a concurrent handler already flipped this row to
  // `ready` with the same primary clip, skip — running the alternates
  // creation + broadcasts + notifications twice causes a unique-constraint
  // collision on `Song.sunoJobId` (GlitchTip Issue 5) and double
  // notifications. The lookup is TOCTOU-racy by definition; the
  // createAlternateSongs P2002 handler below is the second line of defence.
  if (firstSong.id) {
    const current = await prisma.song.findUnique({
      where: { id: song.id },
      select: { generationStatus: true, sunoAudioId: true },
    });
    if (current?.generationStatus === "ready" && current.sunoAudioId === firstSong.id) {
      return { persisted: false, sideEffectErrors: [] };
    }
  }

  const updated = await persistSongCompletion(song, firstSong);
  const alternates = await createAlternateSongs(song, completionSongs);
  await markQueueItemDone(song.id);

  const ctx: SongReadyContext = { song, updated, firstSong, alternates };
  const sideEffectErrors: string[] = [];

  const run = async (name: string, fn: () => void | Promise<void>) => {
    try {
      await fn();
    } catch (err) {
      sideEffectErrors.push(name);
      logger.error(
        { err, songId: song.id, userId: song.userId, sideEffect: name },
        "song-completion: side effect failed",
      );
    }
  };

  await Promise.all([
    run("broadcast", () => broadcastSongReady(ctx)),
    run("cache-assets", () => cacheSongAssets(ctx)),
    run("engagement", () => recordSongReadyEngagement(ctx)),
    run("notify", () => notifyAboutReadySong(ctx)),
    run("invalidate-dashboard", () => invalidateByPrefix(`dashboard-stats:${song.userId}`)),
    run("jam-sync", () => syncJamEntryOnCompletion(song.id, "ready")),
  ]);

  return { persisted: true, sideEffectErrors };
}

export async function handleSongFailure(
  song: SongRecord,
  errorMessage: string,
): Promise<void> {
  await markSongFailed(song, errorMessage);

  try {
    await syncJamEntryOnCompletion(song.id, "failed");
  } catch (err) {
    logger.error(
      { err, songId: song.id },
      "song-completion: jam entry sync failed during failure handling",
    );
  }

  if (!isUserContentReject(errorMessage)) {
    logServerError(
      "song-generation-failed",
      new Error(errorMessage),
      {
        userId: song.userId,
        route: "generation/handleSongFailure",
        params: {
          songId: song.id,
          pollCount: song.pollCount,
          sunoModel: song.sunoModel,
        },
      },
    );
  }

  try {
    broadcast(song.userId, {
      type: "generation_update",
      data: { songId: song.id, status: "failed", errorMessage },
    });
    broadcast(song.userId, { type: "queue_item_complete", data: { songId: song.id } });
  } catch (err) {
    logger.error({ err, songId: song.id, userId: song.userId }, "song-completion: broadcast failed during failure handling");
  }
}

// ── Persistence ─────────────────────────────────────────────────────

async function persistSongCompletion(
  song: SongRecord,
  firstSong: CompletionSong,
): Promise<PersistedSong> {
  const cdnUrlExpiresAt = new Date(Date.now() + CDN_URL_TTL_MS);

  const updated = await prisma.song.update({
    where: { id: song.id },
    data: {
      ...readyTransition,
      sunoAudioId: firstSong.id || undefined,
      audioUrl: firstSong.audioUrl || song.audioUrl,
      audioUrlExpiresAt: firstSong.audioUrl ? cdnUrlExpiresAt : song.audioUrlExpiresAt,
      imageUrl: firstSong.imageUrl || song.imageUrl,
      imageUrlExpiresAt: firstSong.imageUrl ? cdnUrlExpiresAt : song.imageUrlExpiresAt,
      duration: firstSong.duration ?? song.duration,
      lyrics: firstSong.lyrics || song.lyrics,
      title: firstSong.title || song.title,
      tags: firstSong.tags || song.tags,
      sunoModel: firstSong.model || song.sunoModel,
      pollCount: song.pollCount + 1,
    },
  });

  return { id: updated.id, title: updated.title, audioUrl: updated.audioUrl, imageUrl: updated.imageUrl };
}

async function createAlternateSongs(
  song: SongRecord,
  completionSongs: CompletionSong[],
): Promise<AlternateSong[]> {
  if (completionSongs.length <= 1) return [];

  const cdnUrlExpiresAt = new Date(Date.now() + CDN_URL_TTL_MS);
  const alternates: AlternateSong[] = [];

  for (let i = 1; i < completionSongs.length; i++) {
    const extra = completionSongs[i];
    const sunoJobId = extra.id || null;
    try {
      const created = await prisma.song.create({
        data: {
          userId: song.userId,
          sunoJobId,
          sunoAudioId: sunoJobId,
          title: extra.title || song.title,
          prompt: song.prompt,
          tags: extra.tags || song.tags,
          audioUrl: extra.audioUrl || null,
          audioUrlExpiresAt: extra.audioUrl ? cdnUrlExpiresAt : null,
          imageUrl: extra.imageUrl || null,
          imageUrlExpiresAt: extra.imageUrl ? cdnUrlExpiresAt : null,
          duration: extra.duration ?? null,
          lyrics: extra.lyrics || null,
          sunoModel: extra.model || null,
          isInstrumental: song.isInstrumental,
          generationStatus: "ready",
          parentSongId: song.id,
        },
      });
      alternates.push({
        id: created.id,
        parentSongId: song.id,
        title: created.title,
        audioUrl: created.audioUrl,
        imageUrl: created.imageUrl,
        audioSource: extra,
      });
    } catch (err) {
      // P2002 = unique constraint failure. The alternate's sunoJobId is
      // already in the DB — most likely because a concurrent handler (SSE
      // poll + client status poll + stale-pending recovery can all fire
      // handleSongSuccess for the same parent) created it microseconds
      // earlier. Look up the existing row and return its shape so
      // downstream broadcasts + cache writes still see the alternate.
      if (
        sunoJobId &&
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === "P2002"
      ) {
        const existing = await prisma.song.findUnique({
          where: { sunoJobId },
          select: { id: true, title: true, audioUrl: true, imageUrl: true },
        });
        if (existing) {
          logger.info(
            { songId: song.id, sunoJobId, altId: existing.id },
            "song-completion: alternate-create race resolved by lookup",
          );
          alternates.push({
            id: existing.id,
            parentSongId: song.id,
            title: existing.title,
            audioUrl: existing.audioUrl,
            imageUrl: existing.imageUrl,
            audioSource: extra,
          });
          continue;
        }
      }
      throw err;
    }
  }

  return alternates;
}

async function markQueueItemDone(songId: string): Promise<void> {
  await resolveBySongId(songId, { status: "done" });
}

async function markSongFailed(
  song: SongRecord,
  errorMessage: string,
): Promise<void> {
  const transition = await buildFailedTransition(song.id, errorMessage);
  await prisma.song.update({
    where: { id: song.id },
    data: { ...transition, pollCount: song.pollCount + 1 },
  });
  await resolveBySongId(song.id, { status: "failed", errorMessage });
}

