import { describe, expect, it, vi, beforeEach } from "vitest";
import { listLibrarySongs, listReadySongs } from "./server-list";

const mockFindMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
    },
  },
}));

describe("songs/server-list", () => {
  beforeEach(() => {
    mockFindMany.mockReset();
  });

  it("lists library songs with canonical where clause", async () => {
    mockFindMany.mockResolvedValue([
      {
        id: "song-1",
        userId: "user-1",
        title: "Track",
        favorites: [{ id: "fav-1" }],
        songTags: [],
        _count: { favorites: 3, variations: 2 },
      },
    ]);

    const result = await listLibrarySongs("user-1");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1", parentSongId: null, archivedAt: null },
        orderBy: { createdAt: "desc" },
      }),
    );
    expect(result[0]).toMatchObject({
      id: "song-1",
      isFavorite: true,
      favoriteCount: 3,
      variationCount: 2,
    });
  });

  it("lists ready songs with ready status filter", async () => {
    mockFindMany.mockResolvedValue([]);

    await listReadySongs("user-2");

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-2", generationStatus: "ready" },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
