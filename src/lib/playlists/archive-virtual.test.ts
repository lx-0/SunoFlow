import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  env: {},
}));

const mockPlaylistFindFirst = vi.fn();
const mockPlaylistFindMany = vi.fn();
const mockSongFindMany = vi.fn();
const mockSongCount = vi.fn();
const mockPlaylistSongCreate = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    playlist: {
      findFirst: (...a: unknown[]) => mockPlaylistFindFirst(...a),
      findMany: (...a: unknown[]) => mockPlaylistFindMany(...a),
    },
    song: {
      findMany: (...a: unknown[]) => mockSongFindMany(...a),
      findFirst: vi.fn(),
      count: (...a: unknown[]) => mockSongCount(...a),
    },
    playlistSong: {
      create: (...a: unknown[]) => mockPlaylistSongCreate(...a),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/cache", () => ({
  cached: (_k: unknown, fn: () => unknown) => fn(),
  cacheKey: (...p: unknown[]) => p.join(":"),
  CacheTTL: { PLAYLIST: 60 },
  invalidateByPrefix: vi.fn(),
}));
vi.mock("@/lib/activity", () => ({ recordActivity: vi.fn() }));
vi.mock("@/lib/sanitize", () => ({ stripHtml: (s: string) => s }));

const mockEnsureDefaults = vi.fn();
vi.mock("@/lib/smart-playlists/bootstrap", () => ({
  ensureDefaultSmartPlaylists: (...a: unknown[]) => mockEnsureDefaults(...a),
}));

import { getPlaylist, listPlaylists } from "./crud";
import { addSong } from "./songs";
import { executeBatch } from "@/lib/songs/batch";
import { listSmartPlaylistsWithCounts } from "@/lib/smart-playlists/list";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getPlaylist — virtual archive", () => {
  it("projects userArchived songs (not the empty join) for the archive playlist", async () => {
    mockPlaylistFindFirst.mockResolvedValue({
      id: "pl-archive",
      userId: "user-1",
      smartPlaylistType: "archive",
      isSmartPlaylist: true,
      songs: [], // no materialized membership under the virtual model
      _count: { songs: 0 },
    });
    const archived = [
      { id: "s2", archivedAt: new Date("2026-01-02"), createdAt: new Date("2026-01-01") },
      { id: "s1", archivedAt: new Date("2026-01-01"), createdAt: new Date("2026-01-01") },
    ];
    mockSongFindMany.mockResolvedValue(archived);

    const result = await getPlaylist("pl-archive", "user-1");

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Queried the archive filter, ordered by archivedAt desc.
    expect(mockSongFindMany).toHaveBeenCalledWith({
      where: { userId: "user-1", parentSongId: null, archivedAt: { not: null } },
      orderBy: { archivedAt: "desc" },
    });
    expect(result.data.playlist.songs.map((ps) => ps.songId)).toEqual(["s2", "s1"]);
    expect(result.data.playlist._count.songs).toBe(2);
  });

  it("still filters archived songs out of a NORMAL playlist's join", async () => {
    mockPlaylistFindFirst.mockResolvedValue({
      id: "pl-normal",
      userId: "user-1",
      smartPlaylistType: null,
      isSmartPlaylist: false,
      songs: [
        { id: "a", songId: "live", song: { id: "live", archivedAt: null } },
        { id: "b", songId: "gone", song: { id: "gone", archivedAt: new Date() } },
      ],
      _count: { songs: 1 },
    });

    const result = await getPlaylist("pl-normal", "user-1");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.data.playlist.songs.map((ps) => ps.songId)).toEqual(["live"]);
    expect(mockSongFindMany).not.toHaveBeenCalled();
  });
});

describe("addSong — smart playlists reject hand-adds", () => {
  it("refuses to add a song to a smart/archive playlist (no PlaylistSong.create)", async () => {
    mockPlaylistFindFirst.mockResolvedValue({
      id: "pl-archive",
      userId: "user-1",
      isSmartPlaylist: true,
      smartPlaylistType: "archive",
      _count: { songs: 0 },
    });

    const result = await addSong("pl-archive", "user-1", "song-1");

    expect(result.ok).toBe(false);
    expect(mockPlaylistSongCreate).not.toHaveBeenCalled();
  });
});

describe("batch add_to_playlist — smart playlists reject hand-adds too", () => {
  it("refuses the batch add path (mirrors the addSong guard; closes the bypass)", async () => {
    mockSongFindMany.mockResolvedValue([{ id: "song-1" }]); // valid owned songs
    mockPlaylistFindFirst.mockResolvedValue({
      id: "pl-archive",
      userId: "user-1",
      isSmartPlaylist: true,
      smartPlaylistType: "archive",
      _count: { songs: 0 },
    });

    const result = await executeBatch("user-1", {
      action: "add_to_playlist",
      songIds: ["song-1"],
      playlistId: "pl-archive",
    });

    expect(result.ok).toBe(false);
    // Guard fires before appendSongs — no membership row materialized.
    expect(mockPlaylistSongCreate).not.toHaveBeenCalled();
  });
});

describe("listPlaylists — excludes smart playlists", () => {
  it("keeps the virtual Archive (and other smart playlists) out of the user list", async () => {
    mockPlaylistFindMany.mockResolvedValue([]);
    await listPlaylists("user-1");
    const where = mockPlaylistFindMany.mock.calls[0][0].where as {
      userId: string;
      isSmartPlaylist: boolean;
    };
    expect(where).toEqual({ userId: "user-1", isSmartPlaylist: false });
  });
});

describe("listSmartPlaylistsWithCounts — archive count is real", () => {
  it("overrides the archive playlist's join count with the userArchived count", async () => {
    mockEnsureDefaults.mockResolvedValue(undefined);
    mockPlaylistFindMany.mockResolvedValue([
      { id: "pl-top", smartPlaylistType: "top_hits", _count: { songs: 10 } },
      { id: "pl-archive", smartPlaylistType: "archive", _count: { songs: 0 } },
    ]);
    mockSongCount.mockResolvedValue(7);

    const result = await listSmartPlaylistsWithCounts("user-1");

    const archive = result.find((p) => p.smartPlaylistType === "archive");
    const top = result.find((p) => p.smartPlaylistType === "top_hits");
    expect(archive?._count.songs).toBe(7); // real archived count, not the join's 0
    expect(top?._count.songs).toBe(10); // other smart playlists untouched
    expect(mockSongCount).toHaveBeenCalledWith({
      where: { userId: "user-1", parentSongId: null, archivedAt: { not: null } },
    });
  });
});
