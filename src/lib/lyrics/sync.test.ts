import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findFirst: vi.fn() },
    lyricTimestamp: { findMany: vi.fn(), upsert: vi.fn() },
    $transaction: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock("@/lib/sunoapi", () => {
  class SunoApiError extends Error {
    constructor(
      public readonly status: number,
      message: string,
      public readonly code: string = "UNKNOWN",
    ) {
      super(message);
      this.name = "SunoApiError";
    }
  }
  return {
    SunoApiError,
    getTimestampedLyrics: vi.fn(),
    resolveUserApiKey: vi.fn().mockResolvedValue("user-key"),
  };
});

vi.mock("@/lib/error-logger", () => ({ logServerError: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { warn: vi.fn(), error: vi.fn(), debug: vi.fn(), info: vi.fn() },
}));

import { prisma } from "@/lib/prisma";
import {
  getTimestampedLyrics,
  resolveUserApiKey,
  SunoApiError,
} from "@/lib/sunoapi";
import { logServerError } from "@/lib/error-logger";
import { apiCache } from "@/lib/cache";
import { syncLyricTimestamps } from "./sync";

const SONG = {
  lyrics: "Hello world\nSecond line here",
  sunoJobId: "task-1",
  sunoAudioId: "audio-1",
  parentSong: null,
};

const ALIGNED = {
  alignedWords: [
    { word: "Hello", success: true, startS: 0.5, endS: 0.9, palign: 0 },
    { word: "world", success: true, startS: 1.0, endS: 1.4, palign: 0 },
    { word: "Second", success: true, startS: 4.2, endS: 4.6, palign: 0 },
    { word: "line", success: true, startS: 4.8, endS: 5.0, palign: 0 },
    { word: "here", success: true, startS: 5.1, endS: 5.4, palign: 0 },
  ],
  waveformData: [],
  hootCer: 0.9,
  isStreamed: false,
};

beforeEach(() => {
  vi.clearAllMocks();
  apiCache.clear();
  vi.mocked(prisma.song.findFirst).mockResolvedValue(SONG as never);
  vi.mocked(prisma.lyricTimestamp.findMany).mockResolvedValue([] as never);
  vi.mocked(prisma.$transaction).mockResolvedValue([] as never);
  vi.mocked(resolveUserApiKey).mockResolvedValue("user-key");
});

describe("syncLyricTimestamps", () => {
  it("returns NOT_FOUND for songs the user does not own", async () => {
    vi.mocked(prisma.song.findFirst).mockResolvedValue(null as never);

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.code).toBe("NOT_FOUND");
    expect(getTimestampedLyrics).not.toHaveBeenCalled();
  });

  it("returns existing timestamps without calling Suno", async () => {
    const existing = [{ lineIndex: 0, startTime: 1.5 }];
    vi.mocked(prisma.lyricTimestamp.findMany).mockResolvedValue(
      existing as never,
    );

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(result).toEqual({
      ok: true,
      data: { timestamps: existing, source: "existing" },
    });
    expect(getTimestampedLyrics).not.toHaveBeenCalled();
  });

  it.each([
    ["no lyrics", { ...SONG, lyrics: null }],
    ["no task id", { ...SONG, sunoJobId: null, parentSong: null }],
    ["no audio id", { ...SONG, sunoAudioId: null }],
  ])("is unavailable when the song has %s", async (_label, song) => {
    vi.mocked(prisma.song.findFirst).mockResolvedValue(song as never);

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(result).toEqual({
      ok: true,
      data: { timestamps: [], source: "unavailable" },
    });
    expect(getTimestampedLyrics).not.toHaveBeenCalled();
  });

  it("fetches, aligns, persists, and returns synced timestamps", async () => {
    vi.mocked(getTimestampedLyrics).mockResolvedValue(ALIGNED as never);

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(getTimestampedLyrics).toHaveBeenCalledWith(
      "task-1",
      "audio-1",
      "user-key",
    );
    expect(prisma.$transaction).toHaveBeenCalledOnce();
    expect(result).toEqual({
      ok: true,
      data: {
        timestamps: [
          { lineIndex: 0, startTime: 0.5 },
          { lineIndex: 1, startTime: 4.2 },
        ],
        source: "synced",
      },
    });
  });

  it("keys the upstream lookup by the parent's task id for alternates", async () => {
    vi.mocked(prisma.song.findFirst).mockResolvedValue({
      ...SONG,
      sunoJobId: "clip-uuid",
      parentSong: { sunoJobId: "parent-task" },
    } as never);
    vi.mocked(getTimestampedLyrics).mockResolvedValue(ALIGNED as never);

    await syncLyricTimestamps("song-1", "user-1");

    expect(getTimestampedLyrics).toHaveBeenCalledWith(
      "parent-task",
      "audio-1",
      "user-key",
    );
  });

  it("degrades to unavailable on upstream SunoApiError without a Sentry event", async () => {
    vi.mocked(getTimestampedLyrics).mockRejectedValue(
      new SunoApiError(404, "record not found"),
    );

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(result).toEqual({
      ok: true,
      data: { timestamps: [], source: "unavailable" },
    });
    expect(logServerError).not.toHaveBeenCalled();
  });

  it("logs unexpected errors and degrades to unavailable", async () => {
    vi.mocked(getTimestampedLyrics).mockRejectedValue(new Error("boom"));

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(result).toEqual({
      ok: true,
      data: { timestamps: [], source: "unavailable" },
    });
    expect(logServerError).toHaveBeenCalledOnce();
  });

  it("does not retry the billed upstream call after an unavailable outcome", async () => {
    vi.mocked(getTimestampedLyrics).mockRejectedValue(
      new SunoApiError(404, "record not found"),
    );
    await syncLyricTimestamps("song-1", "user-1");

    vi.mocked(getTimestampedLyrics).mockClear();
    await syncLyricTimestamps("song-1", "user-1");

    expect(getTimestampedLyrics).not.toHaveBeenCalled();
  });

  it("is unavailable when the aligned words do not match the lyrics", async () => {
    vi.mocked(getTimestampedLyrics).mockResolvedValue({
      ...ALIGNED,
      alignedWords: [
        { word: "totally", success: true, startS: 0, endS: 0.2, palign: 0 },
        { word: "different", success: true, startS: 0.3, endS: 0.6, palign: 0 },
        { word: "song", success: true, startS: 0.7, endS: 0.9, palign: 0 },
        { word: "text", success: true, startS: 1.0, endS: 1.2, palign: 0 },
      ],
    } as never);

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(result).toEqual({
      ok: true,
      data: { timestamps: [], source: "unavailable" },
    });
    expect(prisma.$transaction).not.toHaveBeenCalled();
  });

  it("guards against a non-array alignedWords payload", async () => {
    vi.mocked(getTimestampedLyrics).mockResolvedValue({
      ...ALIGNED,
      alignedWords: { unexpected: "shape" },
    } as never);

    const result = await syncLyricTimestamps("song-1", "user-1");

    expect(result).toEqual({
      ok: true,
      data: { timestamps: [], source: "unavailable" },
    });
  });
});
