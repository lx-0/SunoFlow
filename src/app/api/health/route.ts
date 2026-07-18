import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { publicRoute } from "@/lib/route-handler";
import { getMetricsSnapshot } from "@/lib/metrics";
import { getSchedulerStatus } from "@/lib/scheduler";
import { getLatestJobRuns, type LatestJobRun } from "@/lib/jobs/job-run";
import { audioCache, imageCache } from "@/lib/cache/file";

const startedAt = Date.now();

export const GET = publicRoute(async () => {
  const uptime = Math.floor((Date.now() - startedAt) / 1000);
  try {
    await prisma.$queryRaw`SELECT 1`;
    const metrics = getMetricsSnapshot();
    const jobs = getSchedulerStatus();

    // Persistent run history (JobRun) drives per-job staleness. Best-effort:
    // a JobRun query error must not fail the health check — staleness is
    // reported as null (unknown) instead.
    let latestRuns: Map<string, LatestJobRun> | null = null;
    try {
      latestRuns = await getLatestJobRuns(jobs.map((j) => j.name));
    } catch {
      latestRuns = null;
    }
    const now = Date.now();

    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      db: true,
      uptime,
      generation: {
        queueDepth: metrics.generation.queueDepth,
        total: metrics.generation.total,
        completed: metrics.generation.completed,
        failed: metrics.generation.failed,
        lastSuccessfulGenerationAt: metrics.generation.lastCompletedAt,
      },
      cache: {
        audio: audioCache.getStats(),
        image: imageCache.getStats(),
      },
      jobs: jobs.map((j) => {
        const latest = latestRuns?.get(j.name) ?? null;
        // stale: true = latest persisted run older than expectedMaxAgeMs (or
        // no run recorded at all); false = fresh; null = unknown (no
        // threshold configured, or JobRun history unavailable).
        let stale: boolean | null = null;
        if (j.expectedMaxAgeMs != null && latestRuns !== null) {
          stale = latest
            ? now - latest.startedAt.getTime() > j.expectedMaxAgeMs
            : true;
        }
        return {
          name: j.name,
          schedule: j.schedule,
          running: j.running,
          nextRun: j.nextRun,
          lastRun: j.lastRun
            ? {
                startedAt: j.lastRun.startedAt,
                durationMs: j.lastRun.durationMs,
                success: j.lastRun.success,
                ...(j.lastRun.error ? { error: j.lastRun.error } : {}),
              }
            : null,
          lastPersistedRun: latest
            ? {
                startedAt: latest.startedAt,
                status: latest.status,
                durationMs: latest.durationMs,
                ...(latest.error ? { error: latest.error } : {}),
              }
            : null,
          stale,
        };
      }),
    });
  } catch {
    return NextResponse.json(
      { status: "error", db: false, uptime },
      { status: 503 }
    );
  }
}, { route: "/api/health" });
