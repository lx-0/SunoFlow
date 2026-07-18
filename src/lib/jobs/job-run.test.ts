import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    jobRun: {
      create: vi.fn(),
      update: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { withJobRun, getLatestJobRuns } from "./job-run";

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(prisma.jobRun.create).mockResolvedValue({ id: "run1" } as never);
  vi.mocked(prisma.jobRun.update).mockResolvedValue({} as never);
});

describe("withJobRun", () => {
  it("records running -> ok with duration and counts on success", async () => {
    const result = await withJobRun("my-job", async () => ({
      processed: 3,
      success: 2,
      fail: 1,
    }));

    expect(result).toEqual({ processed: 3, success: 2, fail: 1 });
    expect(vi.mocked(prisma.jobRun.create)).toHaveBeenCalledWith({
      data: { name: "my-job", status: "running" },
      select: { id: true },
    });
    expect(vi.mocked(prisma.jobRun.update)).toHaveBeenCalledWith({
      where: { id: "run1" },
      data: {
        status: "ok",
        finishedAt: expect.any(Date),
        durationMs: expect.any(Number),
        counts: { processed: 3, success: 2, fail: 1 },
      },
    });
  });

  it("omits counts for void results", async () => {
    await withJobRun("void-job", async () => undefined);

    const updateArg = vi.mocked(prisma.jobRun.update).mock.calls[0][0];
    expect(updateArg.data).not.toHaveProperty("counts");
    expect(updateArg.data.status).toBe("ok");
  });

  it("records failed with the error message and rethrows", async () => {
    await expect(
      withJobRun("bad-job", async () => {
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    expect(vi.mocked(prisma.jobRun.update)).toHaveBeenCalledWith({
      where: { id: "run1" },
      data: {
        status: "failed",
        finishedAt: expect.any(Date),
        durationMs: expect.any(Number),
        error: "boom",
      },
    });
  });

  it("still runs the job when recording the start fails (best-effort)", async () => {
    vi.mocked(prisma.jobRun.create).mockRejectedValue(new Error("db down"));
    const fn = vi.fn().mockResolvedValue({ refreshed: 1 });

    const result = await withJobRun("resilient-job", fn);

    expect(result).toEqual({ refreshed: 1 });
    expect(fn).toHaveBeenCalledTimes(1);
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.objectContaining({ job: "resilient-job" }),
      "job-run: failed to record start"
    );
    // No run id — no finish update attempted
    expect(vi.mocked(prisma.jobRun.update)).not.toHaveBeenCalled();
  });

  it("does not fail the job when recording the finish fails", async () => {
    vi.mocked(prisma.jobRun.update).mockRejectedValue(new Error("db down"));

    await expect(withJobRun("ok-job", async () => "done")).resolves.toBe("done");
    expect(vi.mocked(logger.warn)).toHaveBeenCalledWith(
      expect.objectContaining({ job: "ok-job", runId: "run1" }),
      "job-run: failed to record finish"
    );
  });
});

describe("getLatestJobRuns", () => {
  it("returns a map of latest run per job name", async () => {
    const rows = [
      {
        name: "job-a",
        status: "ok",
        startedAt: new Date("2026-07-18T10:00:00Z"),
        finishedAt: new Date("2026-07-18T10:00:05Z"),
        durationMs: 5000,
        error: null,
      },
      {
        name: "job-b",
        status: "failed",
        startedAt: new Date("2026-07-18T09:00:00Z"),
        finishedAt: new Date("2026-07-18T09:00:01Z"),
        durationMs: 1000,
        error: "boom",
      },
    ];
    vi.mocked(prisma.jobRun.findMany).mockResolvedValue(rows as never);

    const map = await getLatestJobRuns(["job-a", "job-b"]);

    expect(vi.mocked(prisma.jobRun.findMany)).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { name: { in: ["job-a", "job-b"] } },
        orderBy: { startedAt: "desc" },
        distinct: ["name"],
      })
    );
    expect(map.get("job-a")?.status).toBe("ok");
    expect(map.get("job-b")?.error).toBe("boom");
  });

  it("short-circuits on an empty name list", async () => {
    const map = await getLatestJobRuns([]);

    expect(map.size).toBe(0);
    expect(vi.mocked(prisma.jobRun.findMany)).not.toHaveBeenCalled();
  });
});
