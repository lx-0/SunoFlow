import { afterEach, describe, expect, it, vi } from "vitest";
import {
  addSongToPlaylist,
  createPlaylist,
  deletePlaylist,
  fetchPlaylistOptions,
  runSongsBatchAction,
} from "./library-client";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("runSongsBatchAction", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns affected count on success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ affected: 3 })));
    const result = await runSongsBatchAction({
      action: "favorite",
      songIds: ["a", "b", "c"],
    });
    expect(result).toEqual({ ok: true, affected: 3 });
  });

  it("falls back to song count when affected is missing", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));
    const result = await runSongsBatchAction({
      action: "make_public",
      songIds: ["a", "b"],
    });
    expect(result).toEqual({ ok: true, affected: 2 });
  });

  it("returns server error message on non-2xx", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ error: "Nope" }, 400)));
    const result = await runSongsBatchAction({
      action: "delete",
      songIds: ["a"],
    });
    expect(result).toEqual({ ok: false, error: "Nope" });
  });
});

describe("fetchPlaylistOptions", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes playlist shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse({ playlists: [{ id: "p1", name: "Mix", _count: { songs: 4 } }] })
      )
    );
    await expect(fetchPlaylistOptions()).resolves.toEqual([
      { id: "p1", name: "Mix", _count: { songs: 4 } },
    ]);
  });

  it("returns empty array on network failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
    await expect(fetchPlaylistOptions()).resolves.toEqual([]);
  });
});

describe("addSongToPlaylist", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok true when request succeeds", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ ok: true })));
    await expect(addSongToPlaylist("p1", "s1")).resolves.toEqual({ ok: true });
  });

  it("returns api error message on failure", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse({ error: "Already added" }, 409))
    );
    await expect(addSongToPlaylist("p1", "s1")).resolves.toEqual({
      ok: false,
      error: "Already added",
    });
  });
});

describe("createPlaylist", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns playlist on success", async () => {
    const payload = { name: "Morning", description: "vibes" };
    const playlist = {
      id: "pl1",
      name: "Morning",
      description: "vibes",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
      _count: { songs: 0 },
    };
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({ playlist })));
    await expect(createPlaylist(payload)).resolves.toEqual({ ok: true, playlist });
  });

  it("returns invalid response error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));
    await expect(createPlaylist({ name: "Nope" })).resolves.toEqual({
      ok: false,
      error: "Invalid create playlist response",
    });
  });
});

describe("deletePlaylist", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns ok true on delete success", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({})));
    await expect(deletePlaylist("pl1")).resolves.toEqual({ ok: true });
  });

  it("returns api error on failure", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse({}, 500)));
    await expect(deletePlaylist("pl1")).resolves.toEqual({
      ok: false,
      error: "HTTP 500",
    });
  });
});
