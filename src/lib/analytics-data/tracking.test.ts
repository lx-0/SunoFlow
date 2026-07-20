import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() {
    return "postgres://test:test@localhost:5432/test";
  },
  get AUTH_SECRET() {
    return "test-secret";
  },
  get NEXTAUTH_URL() {
    return "http://localhost:3000";
  },
  env: {},
}));

const mockSongFindFirst = vi.fn();
const mockSongViewCreate = vi.fn();
const mockSongUpdate = vi.fn();
const mockTransaction = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findFirst: (...args: unknown[]) => mockSongFindFirst(...args),
      update: (...args: unknown[]) => mockSongUpdate(...args),
    },
    songView: {
      create: (...args: unknown[]) => mockSongViewCreate(...args),
    },
    $transaction: (...args: unknown[]) => mockTransaction(...args),
  },
}));

// Stateful, window-aware fake of the DB-backed anon rate limiter: each
// (action, rawKey) pair may acquire up to `limit` slots before being denied.
const slotUsage = new Map<string, number>();
const mockAcquireAnonRateLimitSlot = vi.fn(
  async (rawKey: string, action: string, limit: number, _windowMs: number) => {
    const key = `${action}:${rawKey}`;
    const used = slotUsage.get(key) ?? 0;
    if (used >= limit) {
      return { acquired: false, status: { remaining: 0, limit, resetAt: "" } };
    }
    slotUsage.set(key, used + 1);
    return {
      acquired: true,
      status: { remaining: limit - used - 1, limit, resetAt: "" },
    };
  },
);

vi.mock("@/lib/rate-limit", () => ({
  acquireAnonRateLimitSlot: (...args: [string, string, number, number]) =>
    mockAcquireAnonRateLimitSlot(...args),
}));

import { recordView } from "./tracking";

const SONG = { id: "song-1" };

beforeEach(() => {
  vi.clearAllMocks();
  slotUsage.clear();
  mockSongFindFirst.mockResolvedValue(SONG);
  mockSongViewCreate.mockResolvedValue({ id: "view-1" });
  mockSongUpdate.mockResolvedValue({ id: "song-1" });
  mockTransaction.mockResolvedValue([{ id: "view-1" }, { id: "song-1" }]);
});

describe("recordView", () => {
  it("counts a single legitimate view", async () => {
    const result = await recordView("song-1", "1.2.3.4");

    expect(result).toEqual({ ok: true, data: { ok: true } });
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("counts only the first of N rapid views from the same IP for the same song", async () => {
    const results = await Promise.all(
      Array.from({ length: 5 }, () => recordView("song-1", "1.2.3.4")),
    );

    // Every request is acknowledged as ok...
    for (const r of results) expect(r.ok).toBe(true);
    // ...but the view is written exactly once — replays are deduped.
    expect(mockTransaction).toHaveBeenCalledTimes(1);
  });

  it("still counts distinct songs from the same IP", async () => {
    await recordView("song-1", "1.2.3.4");
    mockSongFindFirst.mockResolvedValue({ id: "song-2" });
    await recordView("song-2", "1.2.3.4");

    expect(mockTransaction).toHaveBeenCalledTimes(2);
  });

  it("rate-limits an IP flood before touching the DB", async () => {
    // Exhaust the per-IP burst window with distinct songs so dedup never fires.
    for (let i = 0; i < 60; i++) {
      mockSongFindFirst.mockResolvedValue({ id: `song-${i}` });
      const ok = await recordView(`song-${i}`, "9.9.9.9");
      expect(ok.ok).toBe(true);
    }

    const findCallsBefore = mockSongFindFirst.mock.calls.length;
    const throttled = await recordView("song-flood", "9.9.9.9");

    expect(throttled.ok).toBe(false);
    if (!throttled.ok) {
      expect(throttled.status).toBe(429);
      expect(throttled.code).toBe("RATE_LIMITED");
    }
    // No song lookup / write happened for the throttled request.
    expect(mockSongFindFirst.mock.calls.length).toBe(findCallsBefore);
  });

  it("returns validation error for a missing songId", async () => {
    const result = await recordView("", "1.2.3.4");
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
    expect(mockAcquireAnonRateLimitSlot).not.toHaveBeenCalled();
  });
});
