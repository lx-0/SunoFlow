import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  env: {},
}));

// Reduce the route pipeline to a direct handler invocation with a fixed auth ctx.
vi.mock("@/lib/route-handler", () => ({
  authRoute: (
    handler: (req: unknown, ctx: unknown) => Promise<Response>,
  ) => async (req: unknown, ctx: { params: Promise<Record<string, string>> }) =>
    handler(req, { auth: { userId: "user-1" }, params: await ctx.params }),
}));

const mockSongFindFirst = vi.fn();
const mockQueryRaw = vi.fn();

vi.mock("@/lib/prisma", () => ({
  prisma: {
    song: {
      findFirst: (...args: unknown[]) => mockSongFindFirst(...args),
    },
    $queryRaw: (...args: unknown[]) => mockQueryRaw(...args),
  },
}));

import { GET } from "./route";

// Frozen "now" so the 7-day window keys are deterministic.
const NOW = new Date("2026-07-20T12:00:00.000Z");

/** ISO day key for `daysAgo` days before NOW, using the route's own arithmetic. */
function dayKey(daysAgo: number): string {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString().slice(0, 10);
}

/** A raw row as Prisma returns it for `DATE(col)` — a JS Date, not a string. */
function viewRow(daysAgo: number, count: number) {
  return { date: new Date(`${dayKey(daysAgo)}T00:00:00.000Z`), count: BigInt(count) };
}

function call() {
  return GET(new NextRequest("http://localhost/api/songs/song-1/analytics"), {
    params: Promise.resolve({ id: "song-1" }),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  mockSongFindFirst.mockResolvedValue({
    id: "song-1",
    title: "Test Song",
    playCount: 3,
    viewCount: 9,
    duration: 120,
    isPublic: true,
  });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("GET /api/songs/[id]/analytics", () => {
  it("buckets SongView rows (raw Date columns) into the correct per-day keys", async () => {
    // Views spread across today, yesterday, two days ago.
    mockQueryRaw.mockResolvedValue([
      viewRow(0, 5),
      viewRow(1, 2),
      viewRow(2, 4),
    ]);

    const res = await call();
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.views7d).toHaveLength(7);

    const byDate = new Map<string, number>(
      body.views7d.map((d: { date: string; count: number }) => [d.date, d.count]),
    );
    expect(byDate.get(dayKey(0))).toBe(5);
    expect(byDate.get(dayKey(1))).toBe(2);
    expect(byDate.get(dayKey(2))).toBe(4);

    // Days with no views stay at zero.
    expect(byDate.get(dayKey(3))).toBe(0);
    expect(byDate.get(dayKey(6))).toBe(0);

    // Regression guard: the chart must not be all-zeros.
    const total = body.views7d.reduce(
      (sum: number, d: { count: number }) => sum + d.count,
      0,
    );
    expect(total).toBe(11);
  });
});
