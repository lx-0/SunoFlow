import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() {
    return "postgres://test:test@localhost:5432/test";
  },
  env: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: { findMany: vi.fn() },
    playlist: { findMany: vi.fn() },
  },
}));

import { exportUserData } from "./index";
import { prisma } from "@/lib/prisma";

const songFindMany = vi.mocked(prisma.song.findMany);

function makeSong(overrides: Record<string, unknown> = {}) {
  return {
    id: "song-1",
    userId: "user-1",
    title: "Test Song",
    prompt: "upbeat pop",
    tags: "pop, upbeat",
    lyrics: "la la la",
    duration: 120,
    rating: 5,
    ratingNote: "great",
    isFavorite: true,
    isInstrumental: false,
    generationStatus: "ready",
    sunoModel: "V5",
    audioUrl: "https://example.com/a.mp3",
    imageUrl: "https://example.com/a.jpg",
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-02T00:00:00.000Z"),
    songTags: [{ tag: { name: "pop" } }],
    ...overrides,
  };
}

describe("exportUserData — bounded pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches songs with a bounded page size (no unbounded findMany)", async () => {
    // Fewer rows than a page => single query, no second cursor page.
    songFindMany.mockResolvedValueOnce([makeSong()] as never);

    const result = await exportUserData("user-1", "json", "songs");

    expect(result.ok).toBe(true);
    expect(songFindMany).toHaveBeenCalledTimes(1);
    const arg = songFindMany.mock.calls[0][0];
    expect(arg).toMatchObject({ take: 500 });
    // First page carries no cursor.
    expect(arg).not.toHaveProperty("cursor");
  });

  it("keeps the songs export output structure unchanged for a small fixture", async () => {
    songFindMany.mockResolvedValueOnce([makeSong()] as never);

    const result = await exportUserData("user-1", "json", "songs");
    if (!result.ok) throw new Error("expected ok");

    expect(result.data.contentType).toBe("application/json; charset=utf-8");
    expect(result.data.filename).toBe(
      `sunoflow-export-1songs-${new Date().toISOString().split("T")[0]}.json`,
    );

    const parsed = JSON.parse(result.data.content);
    expect(parsed.songCount).toBe(1);
    expect(typeof parsed.exportedAt).toBe("string");
    expect(parsed.songs).toEqual([
      {
        title: "Test Song",
        prompt: "upbeat pop",
        style: "pop, upbeat",
        lyrics: "la la la",
        duration: 120,
        rating: 5,
        ratingNote: "great",
        isFavorite: true,
        isInstrumental: false,
        generationStatus: "ready",
        sunoModel: "V5",
        tags: ["pop"],
        audioUrl: "https://example.com/a.mp3",
        imageUrl: "https://example.com/a.jpg",
        createdAt: "2026-01-01T00:00:00.000Z",
        updatedAt: "2026-01-02T00:00:00.000Z",
      },
    ]);
  });

  it("drains multiple pages via id cursor when a full page is returned", async () => {
    const fullPage = Array.from({ length: 500 }, (_, i) =>
      makeSong({ id: `song-${i}` }),
    );
    songFindMany
      .mockResolvedValueOnce(fullPage as never)
      .mockResolvedValueOnce([] as never);

    const result = await exportUserData("user-1", "json", "songs");

    expect(result.ok).toBe(true);
    expect(songFindMany).toHaveBeenCalledTimes(2);
    // Second call resumes after the last id of page one.
    expect(songFindMany.mock.calls[1][0]).toMatchObject({
      take: 500,
      skip: 1,
      cursor: { id: "song-499" },
    });
  });
});
