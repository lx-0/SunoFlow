import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  env: {},
}));

vi.mock("@/lib/cache", () => ({
  audioCache: { has: vi.fn(), downloadAndPut: vi.fn().mockResolvedValue(undefined) },
  imageCache: { has: vi.fn(), downloadAndPut: vi.fn().mockResolvedValue(undefined) },
}));

import { audioCache, imageCache } from "@/lib/cache";
import { cacheSongAssets } from "./cache-assets";
import type { SongReadyContext } from "./types";

function ctx(overrides: Partial<SongReadyContext> = {}): SongReadyContext {
  return {
    song: {
      id: "song-1", userId: "user-1", prompt: null, tags: null,
      audioUrl: null, audioUrlExpiresAt: null,
      imageUrl: "https://fallback.example.com/i.jpg",
      imageUrlExpiresAt: null,
      duration: null, lyrics: null, title: null, sunoModel: null,
      isInstrumental: false, pollCount: 1,
    },
    updated: { id: "song-1", title: null, audioUrl: null, imageUrl: null },
    firstSong: {
      audioUrl: "https://example.com/audio.mp3",
      imageUrl: "https://example.com/cover.jpg",
    },
    alternates: [],
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(audioCache.has).mockReturnValue(false);
  vi.mocked(imageCache.has).mockReturnValue(false);
});

describe("cacheSongAssets", () => {
  it("downloads primary audio + image when not already cached", async () => {
    await cacheSongAssets(ctx());
    expect(audioCache.downloadAndPut).toHaveBeenCalledWith("song-1", "https://example.com/audio.mp3");
    expect(imageCache.downloadAndPut).toHaveBeenCalledWith("song-1", "https://example.com/cover.jpg");
  });

  it("skips primary audio download when cache already has it", async () => {
    vi.mocked(audioCache.has).mockReturnValue(true);
    await cacheSongAssets(ctx());
    expect(audioCache.downloadAndPut).not.toHaveBeenCalled();
    expect(imageCache.downloadAndPut).toHaveBeenCalled();
  });

  it("falls back to the song's prior imageUrl when firstSong has no image", async () => {
    await cacheSongAssets(ctx({
      firstSong: { audioUrl: "https://example.com/a.mp3" },
    }));
    expect(imageCache.downloadAndPut).toHaveBeenCalledWith("song-1", "https://fallback.example.com/i.jpg");
  });

  it("downloads alternates' audio + image in parallel with primary", async () => {
    await cacheSongAssets(ctx({
      alternates: [
        {
          id: "alt-1", parentSongId: "song-1", title: null,
          audioUrl: null, imageUrl: null,
          audioSource: { audioUrl: "https://example.com/alt1.mp3", imageUrl: "https://example.com/alt1.jpg" },
        },
      ],
    }));
    expect(audioCache.downloadAndPut).toHaveBeenCalledWith("alt-1", "https://example.com/alt1.mp3");
    expect(imageCache.downloadAndPut).toHaveBeenCalledWith("alt-1", "https://example.com/alt1.jpg");
  });

  it("isolates per-asset failures — one CDN 404 must not cancel the rest", async () => {
    vi.mocked(audioCache.downloadAndPut).mockRejectedValueOnce(new Error("404"));
    await expect(
      cacheSongAssets(ctx({
        alternates: [
          {
            id: "alt-1", parentSongId: "song-1", title: null,
            audioUrl: null, imageUrl: null,
            audioSource: { audioUrl: "https://example.com/alt1.mp3" },
          },
        ],
      })),
    ).resolves.not.toThrow();
    // Primary image + alternate audio (which is the rejected one) both attempted
    expect(imageCache.downloadAndPut).toHaveBeenCalled();
  });

  it("is a no-op when firstSong has no audio and no image fallback exists", async () => {
    await cacheSongAssets(ctx({
      firstSong: {},
      song: { ...ctx().song, imageUrl: null },
    }));
    expect(audioCache.downloadAndPut).not.toHaveBeenCalled();
    expect(imageCache.downloadAndPut).not.toHaveBeenCalled();
  });
});
