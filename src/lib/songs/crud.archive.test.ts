import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  env: {},
}));

const mockSongUpdate = vi.fn();
const mockTransaction = vi.fn();
const mockPlaylistUpsert = vi.fn();
const mockPlaylistSongUpsert = vi.fn();
const mockPlaylistSongDeleteMany = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      update: (...args: unknown[]) => mockSongUpdate(...args),
    },
    // Present so a regression that reintroduces materialization would light up
    // here (these must NEVER be called by archive/restore anymore).
    $transaction: (...args: unknown[]) => mockTransaction(...args),
    playlist: { upsert: (...args: unknown[]) => mockPlaylistUpsert(...args) },
    playlistSong: {
      upsert: (...args: unknown[]) => mockPlaylistSongUpsert(...args),
      deleteMany: (...args: unknown[]) => mockPlaylistSongDeleteMany(...args),
    },
  },
}));

const mockFindOwnedSong = vi.fn();
vi.mock("./access", () => ({
  findOwnedSong: (...args: unknown[]) => mockFindOwnedSong(...args),
  ensurePublicSlug: (s: string | null) => s ?? "slug",
  invalidatePublicSongCache: vi.fn(),
  invalidateSongDashboardCache: vi.fn(),
}));

vi.mock("@/lib/sanitize", () => ({
  sanitizeText: (v: string) => ({ value: v, error: null }),
}));

import { archiveSong, restoreSong } from "./crud";

const SONG = { id: "song-1", userId: "user-1", archivedAt: null };

beforeEach(() => {
  vi.clearAllMocks();
});

describe("archiveSong — virtual archive (single source of truth)", () => {
  it("sets archivedAt + isPublic:false via a single song.update, with NO playlist materialization", async () => {
    mockFindOwnedSong.mockResolvedValue(SONG);
    mockSongUpdate.mockResolvedValue({ ...SONG, archivedAt: new Date(), isPublic: false });

    const result = await archiveSong("song-1", "user-1");

    expect(result.ok).toBe(true);
    expect(mockSongUpdate).toHaveBeenCalledTimes(1);
    const call = mockSongUpdate.mock.calls[0][0] as {
      where: { id: string };
      data: { archivedAt: Date; isPublic: boolean };
    };
    expect(call.where).toEqual({ id: "song-1" });
    expect(call.data.archivedAt).toBeInstanceOf(Date);
    expect(call.data.isPublic).toBe(false);

    // The whole point of the fix: archive is virtual. No transaction, no
    // Archive playlist row, no PlaylistSong membership (bug 1 + bug 3 root).
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockPlaylistUpsert).not.toHaveBeenCalled();
    expect(mockPlaylistSongUpsert).not.toHaveBeenCalled();
  });

  it("returns notFound when the song is not owned", async () => {
    mockFindOwnedSong.mockResolvedValue(null);
    const result = await archiveSong("song-x", "user-1");
    expect(result.ok).toBe(false);
    expect(mockSongUpdate).not.toHaveBeenCalled();
  });

  it("rejects a re-archive with a validation error", async () => {
    mockFindOwnedSong.mockResolvedValue({ ...SONG, archivedAt: new Date() });
    const result = await archiveSong("song-1", "user-1");
    expect(result.ok).toBe(false);
    expect(mockSongUpdate).not.toHaveBeenCalled();
  });
});

describe("restoreSong — virtual archive", () => {
  it("clears archivedAt via a single song.update, with NO PlaylistSong cleanup", async () => {
    mockFindOwnedSong.mockResolvedValue({ ...SONG, archivedAt: new Date() });
    mockSongUpdate.mockResolvedValue({ ...SONG, archivedAt: null });

    const result = await restoreSong("song-1", "user-1");

    expect(result.ok).toBe(true);
    expect(mockSongUpdate).toHaveBeenCalledTimes(1);
    const call = mockSongUpdate.mock.calls[0][0] as {
      where: { id: string };
      data: { archivedAt: null };
    };
    expect(call.where).toEqual({ id: "song-1" });
    expect(call.data.archivedAt).toBeNull();
    expect(mockTransaction).not.toHaveBeenCalled();
    expect(mockPlaylistSongDeleteMany).not.toHaveBeenCalled();
  });

  it("only restores an archived song (guard passed to findOwnedSong)", async () => {
    mockFindOwnedSong.mockResolvedValue(null);
    const result = await restoreSong("song-1", "user-1");
    expect(result.ok).toBe(false);
    // The archived-only guard is enforced at the query layer.
    expect(mockFindOwnedSong).toHaveBeenCalledWith("user-1", "song-1", {
      archivedAt: { not: null },
    });
    expect(mockSongUpdate).not.toHaveBeenCalled();
  });
});
