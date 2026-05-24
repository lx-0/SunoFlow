import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findUnique: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/sunoapi", () => ({
  resolveUserApiKey: vi.fn(),
}));

import { prisma } from "@/lib/prisma";
import { resolveUserApiKey } from "@/lib/sunoapi";
import { resolveRootId } from "@/lib/songs/variations/parent-context";
import { resolveParent } from "@/lib/songs/variations/parent-context";

describe("resolveRootId", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("walks to the top-most ancestor", async () => {
    vi.mocked(prisma.song.findUnique)
      .mockResolvedValueOnce({ parentSongId: "root" } as never)
      .mockResolvedValueOnce({ parentSongId: null } as never);

    const rootId = await resolveRootId("song-1", "child-1");

    expect(rootId).toBe("root");
  });

  it("returns when parent links are cyclic", async () => {
    vi.mocked(prisma.song.findUnique)
      .mockResolvedValueOnce({ parentSongId: "b" } as never)
      .mockResolvedValueOnce({ parentSongId: "a" } as never)
      .mockResolvedValueOnce({ parentSongId: "b" } as never);

    const rootId = await resolveRootId("song-1", "a");

    expect(rootId).toBe("a");
    expect(vi.mocked(prisma.song.findUnique).mock.calls.length).toBe(3);
  });
});

describe("resolveParent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses the top-most ancestor as rootId", async () => {
    vi.mocked(prisma.song.findUnique)
      .mockResolvedValueOnce({ id: "child-1", userId: "user-1", parentSongId: "parent-1" } as never)
      .mockResolvedValueOnce({ parentSongId: "root-1" } as never)
      .mockResolvedValueOnce({ parentSongId: null } as never);
    vi.mocked(prisma.song.count).mockResolvedValue(2);
    vi.mocked(resolveUserApiKey).mockResolvedValue(undefined);

    const result = await resolveParent("user-1", "child-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.rootId).toBe("root-1");
    expect(vi.mocked(prisma.song.count)).toHaveBeenCalledWith({
      where: { parentSongId: "root-1" },
    });
  });
});
