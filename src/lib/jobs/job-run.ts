import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import type { Prisma } from "@prisma/client";

/**
 * Persistent run-history for scheduled/cron jobs (JobRun table).
 *
 * withJobRun is the single seam used by both scheduling mechanisms:
 *   - the in-process node-cron scheduler wraps every handler in
 *     src/lib/scheduler.ts runJob
 *   - the HTTP cron routes (src/app/api/cron/*) wrap their handler bodies
 *
 * Bookkeeping is deliberately best-effort: a JobRun insert/update failure
 * (DB hiccup, missing table) must never fail the job itself — jobs like
 * file-cache-eviction don't need the DB at all, and the scheduler must keep
 * working when the DB is briefly down. Failures are logged as warnings.
 */

export type JobRunStatus = "running" | "ok" | "failed";

export interface LatestJobRun {
  name: string;
  status: string;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  error: string | null;
}

/**
 * Extract a JSON-safe counts object from a job result. Jobs return small
 * summary objects ({ processed, success, fail }, { refreshed, skipped },
 * ...); anything else (void, arrays, class instances) records no counts.
 */
function toJsonCounts(result: unknown): Prisma.InputJsonValue | undefined {
  if (result === null || typeof result !== "object" || Array.isArray(result)) {
    return undefined;
  }
  const counts: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(result as Record<string, unknown>)) {
    if (
      typeof value === "number" ||
      typeof value === "string" ||
      typeof value === "boolean"
    ) {
      counts[key] = value;
    }
  }
  if (Object.keys(counts).length === 0) return undefined;
  return counts;
}

/** Run `fn`, recording a JobRun row (running → ok/failed) around it. */
export async function withJobRun<T>(
  name: string,
  fn: () => Promise<T> | T
): Promise<T> {
  const startedMs = Date.now();
  let runId: string | null = null;
  try {
    const run = await prisma.jobRun.create({
      data: { name, status: "running" },
      select: { id: true },
    });
    runId = run.id;
  } catch (err) {
    logger.warn({ job: name, err }, "job-run: failed to record start");
  }

  try {
    const result = await fn();
    await finishRun(name, runId, {
      status: "ok",
      durationMs: Date.now() - startedMs,
      counts: toJsonCounts(result),
    });
    return result;
  } catch (err) {
    await finishRun(name, runId, {
      status: "failed",
      durationMs: Date.now() - startedMs,
      error: err instanceof Error ? err.message : String(err),
    });
    throw err;
  }
}

async function finishRun(
  name: string,
  runId: string | null,
  data: {
    status: JobRunStatus;
    durationMs: number;
    counts?: Prisma.InputJsonValue;
    error?: string;
  }
): Promise<void> {
  if (!runId) return;
  try {
    await prisma.jobRun.update({
      where: { id: runId },
      data: {
        status: data.status,
        finishedAt: new Date(),
        durationMs: data.durationMs,
        ...(data.counts !== undefined ? { counts: data.counts } : {}),
        ...(data.error !== undefined ? { error: data.error } : {}),
      },
    });
  } catch (err) {
    logger.warn({ job: name, runId, err }, "job-run: failed to record finish");
  }
}

/**
 * Latest persisted run per job name (any status — a "running" row still
 * proves the job started). Used by /api/health for staleness detection.
 */
export async function getLatestJobRuns(
  names: string[]
): Promise<Map<string, LatestJobRun>> {
  if (names.length === 0) return new Map();
  const rows = await prisma.jobRun.findMany({
    where: { name: { in: names } },
    orderBy: { startedAt: "desc" },
    distinct: ["name"],
    select: {
      name: true,
      status: true,
      startedAt: true,
      finishedAt: true,
      durationMs: true,
      error: true,
    },
  });
  return new Map(rows.map((row) => [row.name, row]));
}
