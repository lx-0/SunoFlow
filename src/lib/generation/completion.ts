import type { Song } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getTaskStatus, isTerminalFailure } from "@/lib/sunoapi";
import type { SunoSong } from "@/lib/sunoapi";
import { logServerError } from "@/lib/error-logger";
import { broadcast } from "@/lib/event-bus";
import { markSongFailedSimple } from "@/lib/songs/lifecycle";
import { handleSongSuccess, handleSongFailure } from "./song-completion";
import type { SongRecord } from "./song-completion";

const POLL_INTERVAL_MS = 4000;
export const MAX_POLL_ATTEMPTS = 60;

// ── Single-poll interpretation ─────────────────────────────────────

export type PollOutcome =
  | { kind: "ready"; songs: SunoSong[] }
  | { kind: "failed"; errorMessage: string }
  | { kind: "processing" }
  | { kind: "poll_error"; error: unknown };

export async function pollOnce(
  sunoJobId: string,
  apiKey: string | undefined,
): Promise<PollOutcome> {
  let taskResult;
  try {
    taskResult = await getTaskStatus(sunoJobId, apiKey);
  } catch (error) {
    return { kind: "poll_error", error };
  }

  if (taskResult.status === "SUCCESS" && taskResult.songs.length > 0) {
    // Guard: never canonicalize a SUCCESS with no resolvable audio into a
    // terminal ready-but-unplayable row (the 2026-07-08 silent-failure class).
    // mapRawSong already derives cdn1.suno.ai/<id>.mp3 from the clip id, so an
    // empty audioUrl here means the clip has no id at all — genuinely nothing
    // to play. Keep polling; on timeout it becomes a loud, logged failure.
    if (!taskResult.songs[0].audioUrl) {
      return { kind: "processing" };
    }
    return { kind: "ready", songs: taskResult.songs };
  }

  if (isTerminalFailure(taskResult.status)) {
    const errorMessage = taskResult.errorMessage || `Generation failed: ${taskResult.status}`;
    return { kind: "failed", errorMessage };
  }

  return { kind: "processing" };
}

// ── Shared pending-song dispatch ───────────────────────────────────

const TIMEOUT_MESSAGE = "Generation timed out";
const NO_TASK_ID_MESSAGE = "No Suno task ID";

/**
 * A pollOnce outcome, or one of the two pre-poll conditions callers
 * detect before hitting Suno (poll ceiling exceeded, row has no task id).
 */
export type AdvanceOutcome =
  | PollOutcome
  | { kind: "timeout" }
  | { kind: "no_suno_job_id" };

/** What an inconclusive poll (still processing / transient error) means for a caller. */
export type StillPendingAction =
  | { action: "defer"; onDefer?: () => void }
  | { action: "fail"; errorMessage: string };

export interface AdvancePolicy {
  /** GlitchTip attribution when the poll itself threw — labels differ per caller. */
  pollErrorLog: { source: string; route: string; params?: Record<string, unknown> };
  /** What upstream-still-processing means for this caller. Default: bump pollCount. */
  onProcessing?: StillPendingAction;
  /** What an unreachable upstream (poll threw) means for this caller. Default: bump pollCount. */
  onPollError?: StillPendingAction;
  /**
   * When set, the missing-task-id early-fail runs through handleSongFailure
   * with this message (stale-sweep semantics). Default: markSongFailedSimple
   * + a single generation_update broadcast (route semantics).
   */
  noJobIdFailure?: { errorMessage: string };
}

export type AdvanceResult =
  | { status: "ready"; songs: SunoSong[] }
  | { status: "failed"; errorMessage: string }
  | { status: "processing"; pollCount: number; updatedSong: Song };

/**
 * Shared dispatcher for the three pending-song consumers (SSE poll loop,
 * client status poll, stale-pending sweep): given a poll outcome — or a
 * pre-poll condition — persist the song's next state via handleSongSuccess /
 * handleSongFailure / a pollCount bump. Caller-specific differences (log
 * attribution, defer-vs-fail thresholds, no-task-id semantics) are encoded
 * in the policy, not unified — their values intentionally differ per consumer.
 */
export async function advancePendingSong(
  record: SongRecord,
  outcome: AdvanceOutcome,
  policy: AdvancePolicy,
): Promise<AdvanceResult> {
  switch (outcome.kind) {
    case "ready":
      await handleSongSuccess(record, outcome.songs);
      return { status: "ready", songs: outcome.songs };
    case "failed":
      await handleSongFailure(record, outcome.errorMessage);
      return { status: "failed", errorMessage: outcome.errorMessage };
    case "timeout":
      await handleSongFailure(record, TIMEOUT_MESSAGE);
      return { status: "failed", errorMessage: TIMEOUT_MESSAGE };
    case "no_suno_job_id": {
      if (policy.noJobIdFailure) {
        await handleSongFailure(record, policy.noJobIdFailure.errorMessage);
        return { status: "failed", errorMessage: policy.noJobIdFailure.errorMessage };
      }
      await markSongFailedSimple(record.id, NO_TASK_ID_MESSAGE);
      broadcast(record.userId, {
        type: "generation_update",
        data: { songId: record.id, status: "failed", errorMessage: NO_TASK_ID_MESSAGE },
      });
      return { status: "failed", errorMessage: NO_TASK_ID_MESSAGE };
    }
    case "poll_error":
      logServerError(policy.pollErrorLog.source, outcome.error, {
        userId: record.userId,
        route: policy.pollErrorLog.route,
        params: policy.pollErrorLog.params,
      });
      return advanceStillPending(record, policy.onPollError ?? { action: "defer" });
    case "processing":
      return advanceStillPending(record, policy.onProcessing ?? { action: "defer" });
  }
}

async function advanceStillPending(
  record: SongRecord,
  action: StillPendingAction,
): Promise<AdvanceResult> {
  if (action.action === "fail") {
    await handleSongFailure(record, action.errorMessage);
    return { status: "failed", errorMessage: action.errorMessage };
  }
  const pollCount = record.pollCount + 1;
  const updatedSong = await prisma.song.update({
    where: { id: record.id },
    data: { pollCount },
  });
  action.onDefer?.();
  return { status: "processing", pollCount, updatedSong };
}

export interface CompletionUpdate {
  songId: string;
  status: "processing" | "ready" | "failed";
  title?: string | null;
  audioUrl?: string | null;
  imageUrl?: string | null;
  errorMessage?: string | null;
  pollCount?: number;
  alternateCount?: number;
  parentSongId?: string;
}

export interface CompletionTarget {
  songId: string;
  userId: string;
  sunoJobId: string;
  apiKey: string | undefined;
  currentPollCount: number;
  existingSong: {
    title: string | null;
    prompt: string | null;
    tags: string | null;
    audioUrl: string | null;
    imageUrl: string | null;
    duration: number | null;
    lyrics: string | null;
    sunoModel: string | null;
    isInstrumental: boolean;
  };
}

function buildSongRecord(target: CompletionTarget, pollCount: number): SongRecord {
  return {
    id: target.songId,
    userId: target.userId,
    prompt: target.existingSong.prompt,
    tags: target.existingSong.tags,
    audioUrl: target.existingSong.audioUrl,
    audioUrlExpiresAt: null,
    imageUrl: target.existingSong.imageUrl,
    imageUrlExpiresAt: null,
    duration: target.existingSong.duration,
    lyrics: target.existingSong.lyrics,
    title: target.existingSong.title,
    sunoModel: target.existingSong.sunoModel,
    isInstrumental: target.existingSong.isInstrumental,
    pollCount,
  };
}

export async function* pollToCompletion(
  target: CompletionTarget,
  signal?: AbortSignal,
): AsyncGenerator<CompletionUpdate> {
  let pollCount = target.currentPollCount;

  while (!signal?.aborted) {
    pollCount += 1;

    const songRecord = buildSongRecord(target, pollCount - 1);
    const outcome: AdvanceOutcome =
      pollCount > MAX_POLL_ATTEMPTS
        ? { kind: "timeout" }
        : await pollOnce(target.sunoJobId, target.apiKey);

    const result = await advancePendingSong(songRecord, outcome, {
      pollErrorLog: {
        source: "generation-poll",
        route: "generation/completion",
        params: { songId: target.songId, sunoJobId: target.sunoJobId, pollCount },
      },
    });

    switch (result.status) {
      case "ready": {
        const firstSong = result.songs[0];
        yield {
          songId: target.songId,
          status: "ready",
          title: firstSong.title || target.existingSong.title,
          audioUrl: firstSong.audioUrl || target.existingSong.audioUrl,
          imageUrl: firstSong.imageUrl || target.existingSong.imageUrl,
          alternateCount: result.songs.length - 1,
        };
        return;
      }
      case "failed":
        yield { songId: target.songId, status: "failed", errorMessage: result.errorMessage };
        return;
      case "processing":
        yield { songId: target.songId, status: "processing", pollCount: result.pollCount };
        await sleep(POLL_INTERVAL_MS);
        continue;
    }
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
