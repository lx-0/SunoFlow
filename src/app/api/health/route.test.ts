import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "./route";
import { registerJob } from "@/lib/scheduler";
import { getLatestJobRuns } from "@/lib/jobs/job-run";

vi.mock("@/lib/env", () => ({
  get DATABASE_URL() { return "postgres://test:test@localhost:5432/test"; },
  get AUTH_SECRET() { return "test-secret"; },
  get NEXTAUTH_URL() { return "http://localhost:3000"; },
  get SUNOAPI_KEY() { return "test-key"; },
  get SUNO_API_TIMEOUT_MS() { return 30000; },
  get RATE_LIMIT_MAX_GENERATIONS() { return 10; },
  env: {},
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    $queryRaw: vi.fn(),
  },
}));

vi.mock("@/lib/auth", () => ({
  resolveUser: vi.fn(),
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/jobs/job-run", () => ({
  getLatestJobRuns: vi.fn(),
  // scheduler.ts imports withJobRun from the same module — keep it callable
  withJobRun: vi.fn(async (_name: string, fn: () => Promise<unknown>) => fn()),
}));

vi.mock("@/lib/cache/file", () => ({
  audioCache: {
    getStats: vi.fn(() => ({ count: 3, totalBytes: 1500, maxBytes: 2000 })),
  },
  imageCache: {
    getStats: vi.fn(() => ({ count: 1, totalBytes: 100, maxBytes: 500 })),
  },
}));

import { prisma } from "@/lib/prisma";

const HOUR_MS = 60 * 60 * 1000;

// Stable handler references so repeated registerJob calls across tests are
// treated as idempotent duplicates by the scheduler's global registry.
const noopA = async () => {};
const noopB = async () => {};
const noopC = async () => {};
const noopD = async () => {};

describe("GET /api/health", () => {
  const request = new NextRequest("http://localhost/api/health");
  const segmentData = { params: Promise.resolve({}) };

  beforeEach(() => {
    vi.mocked(prisma.$queryRaw).mockResolvedValue([{ "?column?": 1 }]);
    vi.mocked(getLatestJobRuns).mockResolvedValue(new Map());
  });

  it("returns status ok when DB is healthy", async () => {
    const res = await GET(request, segmentData);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    expect(data.db).toBe(true);
    expect(typeof data.uptime).toBe("number");
  });

  it("returns status error when DB is unavailable", async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValue(new Error("Connection refused"));

    const res = await GET(request, segmentData);
    const data = await res.json();

    expect(res.status).toBe(503);
    expect(data.status).toBe("error");
    expect(data.db).toBe(false);
  });

  it("reports cache stats for audio and image caches", async () => {
    const res = await GET(request, segmentData);
    const data = await res.json();

    expect(data.cache).toEqual({
      audio: { count: 3, totalBytes: 1500, maxBytes: 2000 },
      image: { count: 1, totalBytes: 100, maxBytes: 500 },
    });
  });

  it("flags jobs stale based on their latest persisted run vs expectedMaxAgeMs", async () => {
    registerJob("stale-job", "0 * * * *", noopA, { expectedMaxAgeMs: HOUR_MS });
    registerJob("fresh-job", "0 * * * *", noopB, { expectedMaxAgeMs: HOUR_MS });
    registerJob("never-ran-job", "0 * * * *", noopC, { expectedMaxAgeMs: HOUR_MS });
    registerJob("no-threshold-job", "0 * * * *", noopD);

    vi.mocked(getLatestJobRuns).mockResolvedValue(
      new Map([
        [
          "stale-job",
          {
            name: "stale-job",
            status: "ok",
            startedAt: new Date(Date.now() - 2 * HOUR_MS),
            finishedAt: new Date(Date.now() - 2 * HOUR_MS),
            durationMs: 10,
            error: null,
          },
        ],
        [
          "fresh-job",
          {
            name: "fresh-job",
            status: "ok",
            startedAt: new Date(Date.now() - 60_000),
            finishedAt: new Date(Date.now() - 59_000),
            durationMs: 1000,
            error: null,
          },
        ],
      ])
    );

    const res = await GET(request, segmentData);
    const data = await res.json();
    const byName = new Map(
      (data.jobs as { name: string; stale: boolean | null }[]).map((j) => [j.name, j])
    );

    expect(byName.get("stale-job")?.stale).toBe(true);
    expect(byName.get("fresh-job")?.stale).toBe(false);
    // Threshold set but no persisted run at all → stale (the dead-cron case)
    expect(byName.get("never-ran-job")?.stale).toBe(true);
    // No threshold configured → staleness unknown
    expect(byName.get("no-threshold-job")?.stale).toBeNull();
  });

  it("keeps health ok with unknown staleness when run history is unavailable", async () => {
    registerJob("stale-job", "0 * * * *", noopA, { expectedMaxAgeMs: HOUR_MS });
    vi.mocked(getLatestJobRuns).mockRejectedValue(new Error("relation does not exist"));

    const res = await GET(request, segmentData);
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data.status).toBe("ok");
    const job = (data.jobs as { name: string; stale: boolean | null }[]).find(
      (j) => j.name === "stale-job"
    );
    expect(job?.stale).toBeNull();
  });
});
