import { afterEach, describe, expect, it, vi } from "vitest";

import {
  persistPlaylistReorder,
  reorderByIndex,
  reorderSongsWithIds,
} from "./playlist-detail-utils";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("reorderByIndex", () => {
  it("moves an item from one index to another", () => {
    expect(reorderByIndex(["a", "b", "c"], 0, 2)).toEqual(["b", "c", "a"]);
  });

  it("returns original items when index is out of bounds", () => {
    const input = ["a", "b", "c"];
    expect(reorderByIndex(input, -1, 1)).toBe(input);
    expect(reorderByIndex(input, 1, 99)).toBe(input);
  });
});

describe("reorderSongsWithIds", () => {
  it("returns both reordered items and songIds for persistence", () => {
    const input = [
      { songId: "s1", position: 0 },
      { songId: "s2", position: 1 },
      { songId: "s3", position: 2 },
    ];

    const result = reorderSongsWithIds(input, 2, 0);

    expect(result.reordered.map((row) => row.songId)).toEqual(["s3", "s1", "s2"]);
    expect(result.songIds).toEqual(["s3", "s1", "s2"]);
  });
});

describe("persistPlaylistReorder", () => {
  it("returns true when API responds with ok", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchMock);

    await expect(persistPlaylistReorder("p1", ["s1", "s2"]))
      .resolves.toBe(true);

    expect(fetchMock).toHaveBeenCalledWith("/api/playlists/p1/reorder", expect.objectContaining({
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ songIds: ["s1", "s2"] }),
    }));
  });

  it("returns false when API responds non-ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    await expect(persistPlaylistReorder("p1", ["s1"]))
      .resolves.toBe(false);
  });
});
