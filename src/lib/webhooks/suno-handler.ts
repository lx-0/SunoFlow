import type { Song } from "@prisma/client";
import { logger } from "@/lib/logger";
import { prisma } from "@/lib/prisma";
import { handleSongFailure, handleSongSuccess } from "@/lib/generation";
import { mapRawSong, taskStatusToSongStatus, isTerminalFailure } from "@/lib/sunoapi/mappers";
import type { TaskStatus } from "@/lib/sunoapi/types";
import type { SunoWebhookPayload } from "./suno-request";

interface SunoWebhookHandlerDeps {
  findSongByTaskId: (taskId: string) => Promise<Song | null>;
  handleSongSuccess: typeof handleSongSuccess;
  handleSongFailure: typeof handleSongFailure;
}

function isTerminalGenerationStatus(status: Song["generationStatus"]) {
  return status === "ready" || status === "failed";
}

export interface SunoWebhookProcessInput {
  payload: SunoWebhookPayload;
  taskId: string;
  status: TaskStatus;
}

export interface SunoWebhookProcessResult {
  kind: "processed" | "duplicate" | "not_found" | "processing";
}

const defaultDeps: SunoWebhookHandlerDeps = {
  findSongByTaskId: (taskId) => prisma.song.findUnique({ where: { sunoJobId: taskId } }),
  handleSongSuccess,
  handleSongFailure,
};

export async function processSunoWebhook(
  input: SunoWebhookProcessInput,
  deps: SunoWebhookHandlerDeps = defaultDeps,
): Promise<SunoWebhookProcessResult> {
  const { payload, taskId, status } = input;
  logger.info({ taskId, status }, "suno-webhook: received callback");

  const song = await deps.findSongByTaskId(taskId);
  if (!song) {
    logger.warn({ taskId }, "suno-webhook: no song found for taskId");
    return { kind: "not_found" };
  }

  if (isTerminalGenerationStatus(song.generationStatus)) {
    logger.info({ songId: song.id, status: song.generationStatus }, "suno-webhook: ignoring callback for terminal song");
    return { kind: "duplicate" };
  }

  if (status === "SUCCESS") {
    const rawSongs = payload.data?.response?.sunoData ?? [];
    const songs = rawSongs.map((raw) => {
      const mapped = mapRawSong(raw);
      mapped.status = taskStatusToSongStatus(status);
      return mapped;
    });
    // Guard (mirrors pollOnce in generation/completion.ts): never canonicalize a
    // SUCCESS with no resolvable audio into a terminal ready-but-unplayable row
    // (the 2026-07-08 silent-failure class). mapRawSong already derives
    // cdn1.suno.ai/<id>.mp3 from the clip id, so an empty audioUrl means the
    // clip has no id at all — genuinely nothing to play. ACK as still-processing
    // and leave the row pending so the poll/stale-recovery path resolves it loudly.
    if (!songs[0]?.audioUrl) {
      logger.warn({ songId: song.id, taskId }, "suno-webhook: SUCCESS with no resolvable audio — keeping pending");
      return { kind: "processing" };
    }
    await deps.handleSongSuccess(song, songs);
    return { kind: "processed" };
  }

  if (isTerminalFailure(status)) {
    const errorMessage = payload.data?.errorMessage || `Generation failed: ${status}`;
    await deps.handleSongFailure(song, errorMessage);
    return { kind: "processed" };
  }

  return { kind: "processed" };
}
