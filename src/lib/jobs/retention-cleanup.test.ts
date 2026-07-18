import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    errorReport: { deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    playEvent: { deleteMany: vi.fn() },
    songView: { deleteMany: vi.fn() },
    activity: { deleteMany: vi.fn() },
    playHistory: { deleteMany: vi.fn() },
    jobRun: { deleteMany: vi.fn() },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import {
  retentionCleanup,
  ERROR_REPORT_RETENTION_DAYS,
  READ_NOTIFICATION_RETENTION_DAYS,
  ANALYTICS_EVENT_RETENTION_DAYS,
  ACTIVITY_RETENTION_DAYS,
  PLAY_HISTORY_RETENTION_DAYS,
  JOB_RUN_RETENTION_DAYS,
} from "./retention-cleanup";

const NOW = new Date("2026-07-18T12:00:00.000Z");

function daysAgo(days: number): Date {
  return new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
  vi.mocked(prisma.errorReport.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.playEvent.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.songView.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.activity.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.playHistory.deleteMany).mockResolvedValue({ count: 0 });
  vi.mocked(prisma.jobRun.deleteMany).mockResolvedValue({ count: 0 });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("retentionCleanup", () => {
  it("prunes error reports older than the retention window", async () => {
    await retentionCleanup();

    expect(vi.mocked(prisma.errorReport.deleteMany)).toHaveBeenCalledWith({
      where: { createdAt: { lt: daysAgo(ERROR_REPORT_RETENTION_DAYS) } },
    });
  });

  it("prunes only read notifications older than the retention window", async () => {
    await retentionCleanup();

    expect(vi.mocked(prisma.notification.deleteMany)).toHaveBeenCalledWith({
      where: {
        read: true,
        createdAt: { lt: daysAgo(READ_NOTIFICATION_RETENTION_DAYS) },
      },
    });
  });

  it("prunes raw analytics events on their own timestamp columns", async () => {
    await retentionCleanup();

    expect(vi.mocked(prisma.playEvent.deleteMany)).toHaveBeenCalledWith({
      where: { startedAt: { lt: daysAgo(ANALYTICS_EVENT_RETENTION_DAYS) } },
    });
    expect(vi.mocked(prisma.songView.deleteMany)).toHaveBeenCalledWith({
      where: { viewedAt: { lt: daysAgo(ANALYTICS_EVENT_RETENTION_DAYS) } },
    });
  });

  it("trims activity and play history with the long window", async () => {
    await retentionCleanup();

    expect(vi.mocked(prisma.activity.deleteMany)).toHaveBeenCalledWith({
      where: { createdAt: { lt: daysAgo(ACTIVITY_RETENTION_DAYS) } },
    });
    expect(vi.mocked(prisma.playHistory.deleteMany)).toHaveBeenCalledWith({
      where: { playedAt: { lt: daysAgo(PLAY_HISTORY_RETENTION_DAYS) } },
    });
  });

  it("prunes job run history with the short window", async () => {
    await retentionCleanup();

    expect(vi.mocked(prisma.jobRun.deleteMany)).toHaveBeenCalledWith({
      where: { startedAt: { lt: daysAgo(JOB_RUN_RETENTION_DAYS) } },
    });
  });

  it("logs deleted counts per table", async () => {
    vi.mocked(prisma.errorReport.deleteMany).mockResolvedValue({ count: 1 });
    vi.mocked(prisma.notification.deleteMany).mockResolvedValue({ count: 2 });
    vi.mocked(prisma.playEvent.deleteMany).mockResolvedValue({ count: 3 });
    vi.mocked(prisma.songView.deleteMany).mockResolvedValue({ count: 4 });
    vi.mocked(prisma.activity.deleteMany).mockResolvedValue({ count: 5 });
    vi.mocked(prisma.playHistory.deleteMany).mockResolvedValue({ count: 6 });
    vi.mocked(prisma.jobRun.deleteMany).mockResolvedValue({ count: 7 });

    await retentionCleanup();

    expect(vi.mocked(logger.info)).toHaveBeenCalledWith(
      {
        deletedErrorReports: 1,
        deletedReadNotifications: 2,
        deletedPlayEvents: 3,
        deletedSongViews: 4,
        deletedActivities: 5,
        deletedPlayHistory: 6,
        deletedJobRuns: 7,
      },
      "jobs: retention-cleanup done"
    );
  });
});
