import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  get WEBHOOK_BASE_URL() { return "http://localhost:3000"; },
  get SUNO_WEBHOOK_SECRET() { return "test-webhook-secret"; },
  env: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/sunoapi", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sunoapi")>("@/lib/sunoapi");
  return { ...actual, getTaskStatus: vi.fn() };
});

vi.mock("./song-completion", () => ({
  handleSongSuccess: vi.fn().mockResolvedValue({ persisted: true, sideEffectErrors: [] }),
  handleSongFailure: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/error-logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/event-bus", () => ({ broadcast: vi.fn() }));
vi.mock("@/lib/songs/lifecycle", () => ({
  markSongFailedSimple: vi.fn().mockResolvedValue(undefined),
}));

import { prisma } from "@/lib/prisma";
import { getTaskStatus } from "@/lib/sunoapi";
import type { SunoSong, TaskStatusResult } from "@/lib/sunoapi";
import { logServerError } from "@/lib/error-logger";
import { broadcast } from "@/lib/event-bus";
import { markSongFailedSimple } from "@/lib/songs/lifecycle";
import { handleSongSuccess, handleSongFailure } from "./song-completion";
import type { SongRecord } from "./song-completion";
import {
  pollOnce,
  pollToCompletion,
  advancePendingSong,
  MAX_POLL_ATTEMPTS,
  type AdvanceOutcome,
  type AdvancePolicy,
  type CompletionTarget,
  type PollOutcome,
} from "./completion";

const POLL_INTERVAL_MS = 4000;

// ─── Fixtures ────────────────────────────────────────────────────────

function makeSunoSong(overrides: Partial<SunoSong> = {}): SunoSong {
  return {
    id: "clip-1",
    title: "Test Song",
    prompt: "p",
    audioUrl: "https://cdn1.suno.ai/clip-1.mp3",
    status: "complete",
    createdAt: "2026-07-01T00:00:00Z",
    ...overrides,
  };
}

function makeTaskResult(overrides: Partial<TaskStatusResult> = {}): TaskStatusResult {
  return { taskId: "task-1", status: "PENDING", songs: [], errorMessage: null, ...overrides };
}

const baseRecord: SongRecord = {
  id: "song-1",
  userId: "user-1",
  prompt: "p",
  tags: "t",
  audioUrl: null,
  audioUrlExpiresAt: null,
  imageUrl: null,
  imageUrlExpiresAt: null,
  duration: null,
  lyrics: null,
  title: "Draft Title",
  sunoModel: null,
  isInstrumental: false,
  pollCount: 3,
};

const basePolicy: AdvancePolicy = {
  pollErrorLog: {
    source: "test-poll",
    route: "test/route",
    params: { songId: "song-1", sunoJobId: "task-1" },
  },
};

function makeTarget(overrides: Partial<CompletionTarget> = {}): CompletionTarget {
  return {
    songId: "song-1",
    userId: "user-1",
    sunoJobId: "task-1",
    apiKey: undefined,
    currentPollCount: 0,
    existingSong: {
      title: "Draft Title",
      prompt: "p",
      tags: "t",
      audioUrl: null,
      imageUrl: null,
      duration: null,
      lyrics: null,
      sunoModel: null,
      isInstrumental: false,
    },
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.song.update).mockResolvedValue({ id: "song-1", pollCount: 4 } as never);
});

// ─── pollOnce ────────────────────────────────────────────────────────

describe("pollOnce", () => {
  const readySong = makeSunoSong();

  const cases: Array<{ name: string; taskResult: TaskStatusResult; expected: PollOutcome }> = [
    {
      name: "SUCCESS with playable audio → ready",
      taskResult: makeTaskResult({ status: "SUCCESS", songs: [readySong] }),
      expected: { kind: "ready", songs: [readySong] },
    },
    {
      // The 2026-07-08 silent-failure guard: SUCCESS whose clip has no
      // resolvable audio keeps polling instead of canonicalizing an
      // unplayable ready row.
      name: "SUCCESS with empty audioUrl → processing (silent-failure guard)",
      taskResult: makeTaskResult({ status: "SUCCESS", songs: [makeSunoSong({ audioUrl: "" })] }),
      expected: { kind: "processing" },
    },
    {
      name: "SUCCESS with zero clips → processing",
      taskResult: makeTaskResult({ status: "SUCCESS", songs: [] }),
      expected: { kind: "processing" },
    },
    {
      name: "terminal failure with upstream message → failed with that message",
      taskResult: makeTaskResult({ status: "GENERATE_AUDIO_FAILED", errorMessage: "Vocals rejected" }),
      expected: { kind: "failed", errorMessage: "Vocals rejected" },
    },
    {
      name: "terminal failure without message → failed with status fallback",
      taskResult: makeTaskResult({ status: "SENSITIVE_WORD_ERROR", errorMessage: null }),
      expected: { kind: "failed", errorMessage: "Generation failed: SENSITIVE_WORD_ERROR" },
    },
    {
      name: "PENDING → processing",
      taskResult: makeTaskResult({ status: "PENDING" }),
      expected: { kind: "processing" },
    },
    {
      name: "FIRST_SUCCESS (non-terminal mid-state) → processing",
      taskResult: makeTaskResult({ status: "FIRST_SUCCESS" }),
      expected: { kind: "processing" },
    },
  ];

  it.each(cases)("$name", async ({ taskResult, expected }) => {
    vi.mocked(getTaskStatus).mockResolvedValue(taskResult);
    await expect(pollOnce("task-1", undefined)).resolves.toEqual(expected);
  });

  it("maps a thrown getTaskStatus into poll_error carrying the original error", async () => {
    const boom = new Error("ECONNRESET");
    vi.mocked(getTaskStatus).mockRejectedValue(boom);
    await expect(pollOnce("task-1", "user-key")).resolves.toEqual({ kind: "poll_error", error: boom });
    expect(getTaskStatus).toHaveBeenCalledWith("task-1", "user-key");
  });
});

// ─── advancePendingSong ──────────────────────────────────────────────

describe("advancePendingSong", () => {
  it("ready → handleSongSuccess with the record and clips", async () => {
    const songs = [makeSunoSong()];
    const result = await advancePendingSong(baseRecord, { kind: "ready", songs }, basePolicy);
    expect(result).toEqual({ status: "ready", songs });
    expect(handleSongSuccess).toHaveBeenCalledWith(baseRecord, songs);
    expect(handleSongFailure).not.toHaveBeenCalled();
  });

  const failureCases: Array<{
    name: string;
    outcome: AdvanceOutcome;
    policy: AdvancePolicy;
    expectedMessage: string;
  }> = [
    {
      name: "terminal failed outcome → handleSongFailure with the upstream message",
      outcome: { kind: "failed", errorMessage: "Content policy violation" },
      policy: basePolicy,
      expectedMessage: "Content policy violation",
    },
    {
      name: "timeout → handleSongFailure('Generation timed out')",
      outcome: { kind: "timeout" },
      policy: basePolicy,
      expectedMessage: "Generation timed out",
    },
    {
      name: "no_suno_job_id with noJobIdFailure policy → handleSongFailure with the policy message",
      outcome: { kind: "no_suno_job_id" },
      policy: { ...basePolicy, noJobIdFailure: { errorMessage: "Generation timed out (no Suno task ID)" } },
      expectedMessage: "Generation timed out (no Suno task ID)",
    },
    {
      name: "processing with fail action → handleSongFailure with the ceiling message",
      outcome: { kind: "processing" },
      policy: { ...basePolicy, onProcessing: { action: "fail", errorMessage: "Generation timed out (upstream still processing)" } },
      expectedMessage: "Generation timed out (upstream still processing)",
    },
    {
      name: "poll_error with fail action → handleSongFailure with the lost-upstream message",
      outcome: { kind: "poll_error", error: new Error("404") },
      policy: { ...basePolicy, onPollError: { action: "fail", errorMessage: "Generation timed out (upstream lost)" } },
      expectedMessage: "Generation timed out (upstream lost)",
    },
  ];

  it.each(failureCases)("$name", async ({ outcome, policy, expectedMessage }) => {
    const result = await advancePendingSong(baseRecord, outcome, policy);
    expect(result).toEqual({ status: "failed", errorMessage: expectedMessage });
    expect(handleSongFailure).toHaveBeenCalledWith(baseRecord, expectedMessage);
    expect(prisma.song.update).not.toHaveBeenCalled();
  });

  it("no_suno_job_id without policy override → markSongFailedSimple + broadcast (route semantics)", async () => {
    const result = await advancePendingSong(baseRecord, { kind: "no_suno_job_id" }, basePolicy);
    expect(result).toEqual({ status: "failed", errorMessage: "No Suno task ID" });
    expect(markSongFailedSimple).toHaveBeenCalledWith("song-1", "No Suno task ID");
    expect(broadcast).toHaveBeenCalledWith("user-1", {
      type: "generation_update",
      data: { songId: "song-1", status: "failed", errorMessage: "No Suno task ID" },
    });
    expect(handleSongFailure).not.toHaveBeenCalled();
  });

  it("processing with default defer → bumps pollCount and returns the updated row", async () => {
    const onDefer = vi.fn();
    const result = await advancePendingSong(
      baseRecord,
      { kind: "processing" },
      { ...basePolicy, onProcessing: { action: "defer", onDefer } },
    );
    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: "song-1" },
      data: { pollCount: 4 },
    });
    expect(onDefer).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "processing",
      pollCount: 4,
      updatedSong: { id: "song-1", pollCount: 4 },
    });
    expect(handleSongFailure).not.toHaveBeenCalled();
  });

  it("poll_error with default defer → logs with the policy attribution, then bumps pollCount", async () => {
    const boom = new Error("Connection reset");
    const result = await advancePendingSong(baseRecord, { kind: "poll_error", error: boom }, basePolicy);
    expect(logServerError).toHaveBeenCalledWith("test-poll", boom, {
      userId: "user-1",
      route: "test/route",
      params: { songId: "song-1", sunoJobId: "task-1" },
    });
    expect(prisma.song.update).toHaveBeenCalledWith({
      where: { id: "song-1" },
      data: { pollCount: 4 },
    });
    expect(result).toMatchObject({ status: "processing", pollCount: 4 });
    expect(handleSongFailure).not.toHaveBeenCalled();
  });
});

// ─── pollToCompletion ────────────────────────────────────────────────

describe("pollToCompletion", () => {
  it("fails with 'Generation timed out' past the poll ceiling, without polling upstream", async () => {
    const gen = pollToCompletion(makeTarget({ currentPollCount: MAX_POLL_ATTEMPTS }));
    const first = await gen.next();
    expect(first.value).toEqual({
      songId: "song-1",
      status: "failed",
      errorMessage: "Generation timed out",
    });
    expect(handleSongFailure).toHaveBeenCalledWith(
      expect.objectContaining({ id: "song-1", pollCount: MAX_POLL_ATTEMPTS }),
      "Generation timed out",
    );
    expect(getTaskStatus).not.toHaveBeenCalled();
    await expect(gen.next()).resolves.toMatchObject({ done: true });
  });

  it("processing → bumps pollCount, yields, sleeps, then loops into the ready outcome", async () => {
    vi.useFakeTimers();
    try {
      vi.mocked(getTaskStatus)
        .mockResolvedValueOnce(makeTaskResult({ status: "PENDING" }))
        .mockResolvedValueOnce(makeTaskResult({ status: "SUCCESS", songs: [makeSunoSong()] }));

      const gen = pollToCompletion(makeTarget());
      const first = await gen.next();
      expect(first.value).toEqual({ songId: "song-1", status: "processing", pollCount: 1 });
      expect(prisma.song.update).toHaveBeenCalledWith({
        where: { id: "song-1" },
        data: { pollCount: 1 },
      });

      // The generator sleeps between polls: flushing microtasks alone must
      // NOT trigger the second poll; advancing the interval must.
      const secondPromise = gen.next();
      await vi.advanceTimersByTimeAsync(0);
      expect(getTaskStatus).toHaveBeenCalledTimes(1);
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);

      const second = await secondPromise;
      expect(second.value).toEqual({
        songId: "song-1",
        status: "ready",
        title: "Test Song",
        audioUrl: "https://cdn1.suno.ai/clip-1.mp3",
        imageUrl: null,
        alternateCount: 0,
      });
      expect(handleSongSuccess).toHaveBeenCalledWith(
        expect.objectContaining({ id: "song-1", pollCount: 1 }),
        [expect.objectContaining({ id: "clip-1" })],
      );
      await expect(gen.next()).resolves.toMatchObject({ done: true });
    } finally {
      vi.useRealTimers();
    }
  });

  it("poll_error → logs, defers as processing, then surfaces the terminal failure next loop", async () => {
    vi.useFakeTimers();
    try {
      const boom = new Error("upstream 502");
      vi.mocked(getTaskStatus)
        .mockRejectedValueOnce(boom)
        .mockResolvedValueOnce(
          makeTaskResult({ status: "GENERATE_AUDIO_FAILED", errorMessage: "No vocals generated" }),
        );

      const gen = pollToCompletion(makeTarget());
      const first = await gen.next();
      expect(first.value).toEqual({ songId: "song-1", status: "processing", pollCount: 1 });
      expect(logServerError).toHaveBeenCalledWith("generation-poll", boom, {
        userId: "user-1",
        route: "generation/completion",
        params: { songId: "song-1", sunoJobId: "task-1", pollCount: 1 },
      });

      const secondPromise = gen.next();
      await vi.advanceTimersByTimeAsync(POLL_INTERVAL_MS);
      const second = await secondPromise;
      expect(second.value).toEqual({
        songId: "song-1",
        status: "failed",
        errorMessage: "No vocals generated",
      });
      expect(handleSongFailure).toHaveBeenCalledWith(
        expect.objectContaining({ id: "song-1", pollCount: 1 }),
        "No vocals generated",
      );
      await expect(gen.next()).resolves.toMatchObject({ done: true });
    } finally {
      vi.useRealTimers();
    }
  });
});
