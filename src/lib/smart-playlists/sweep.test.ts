import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  env: {},
}));

const mockPlaylistFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    playlist: { findMany: (...a: unknown[]) => mockPlaylistFindMany(...a) },
  },
}));

const mockRefreshSmartPlaylist = vi.fn();
vi.mock("./refresh", () => ({
  refreshSmartPlaylist: (...a: unknown[]) => mockRefreshSmartPlaylist(...a),
}));

vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), info: vi.fn(), warn: vi.fn() },
}));

import { refreshThreshold, isStale, refreshStalePlaylists } from "./sweep";

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

describe("refreshThreshold", () => {
  it("returns weekly threshold for top_hits", () => {
    expect(refreshThreshold("top_hits")).toBe(WEEK_MS);
  });

  it("returns weekly threshold for similar_to", () => {
    expect(refreshThreshold("similar_to")).toBe(WEEK_MS);
  });

  it("returns daily threshold for new_this_week", () => {
    expect(refreshThreshold("new_this_week")).toBe(DAY_MS);
  });

  it("returns daily threshold for mood", () => {
    expect(refreshThreshold("mood")).toBe(DAY_MS);
  });
});

describe("isStale", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("treats null lastRefreshedAt as stale", () => {
    expect(isStale("top_hits", null)).toBe(true);
  });

  it("returns false when refreshed recently for a daily type", () => {
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    expect(isStale("mood", tenMinutesAgo)).toBe(false);
  });

  it("returns true when refreshed over a day ago for a daily type", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * DAY_MS);
    expect(isStale("new_this_week", twoDaysAgo)).toBe(true);
  });

  it("returns false when refreshed 3 days ago for a weekly type", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * DAY_MS);
    expect(isStale("top_hits", threeDaysAgo)).toBe(false);
  });

  it("returns true when refreshed 8 days ago for a weekly type", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * DAY_MS);
    expect(isStale("similar_to", eightDaysAgo)).toBe(true);
  });
});

describe("refreshStalePlaylists — archive is never swept", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("skips the virtual 'archive' playlist and never refreshes (would wipe it)", async () => {
    // Both stale (null smartRefreshedAt), but archive must be left untouched —
    // refreshing it would deleteMany its membership and repopulate with [].
    mockPlaylistFindMany.mockResolvedValue([
      { id: "pl-archive", smartPlaylistType: "archive", smartRefreshedAt: null },
      { id: "pl-top", smartPlaylistType: "top_hits", smartRefreshedAt: null },
    ]);
    mockRefreshSmartPlaylist.mockResolvedValue(undefined);

    const result = await refreshStalePlaylists();

    const refreshedIds = mockRefreshSmartPlaylist.mock.calls.map((c) => c[0]);
    expect(refreshedIds).toContain("pl-top");
    expect(refreshedIds).not.toContain("pl-archive");
    expect(result.refreshed).toBe(1);
    expect(result.skipped).toBe(1);
  });
});
