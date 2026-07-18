import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

// Retention windows for the append-only, high-cardinality tables that had no
// cleanup while Session/RateLimit already do. Values are deliberately
// conservative and tunable — adjust here as data volume dictates.
//
// Notes:
// - Notifications: only READ rows are pruned; unread rows are kept forever.
// - PlayEvent/SongView back the analytics dashboards (src/lib/analytics-data),
//   which count them without a date filter — once rows age out, "lifetime"
//   totals become rolling-window totals.
// - Activity/PlayHistory are user-facing (feed, history, stats), so they get
//   the longest window.
export const ERROR_REPORT_RETENTION_DAYS = 90;
export const READ_NOTIFICATION_RETENTION_DAYS = 90;
export const ANALYTICS_EVENT_RETENTION_DAYS = 180; // PlayEvent + SongView
export const ACTIVITY_RETENTION_DAYS = 365;
export const PLAY_HISTORY_RETENTION_DAYS = 365;
export const JOB_RUN_RETENTION_DAYS = 30; // scheduler/cron run history

const DAY_MS = 24 * 60 * 60 * 1000;

function cutoff(now: number, days: number): Date {
  return new Date(now - days * DAY_MS);
}

export async function retentionCleanup(): Promise<void> {
  const now = Date.now();

  const { count: errorReports } = await prisma.errorReport.deleteMany({
    where: { createdAt: { lt: cutoff(now, ERROR_REPORT_RETENTION_DAYS) } },
  });
  const { count: readNotifications } = await prisma.notification.deleteMany({
    where: {
      read: true,
      createdAt: { lt: cutoff(now, READ_NOTIFICATION_RETENTION_DAYS) },
    },
  });
  const { count: playEvents } = await prisma.playEvent.deleteMany({
    where: { startedAt: { lt: cutoff(now, ANALYTICS_EVENT_RETENTION_DAYS) } },
  });
  const { count: songViews } = await prisma.songView.deleteMany({
    where: { viewedAt: { lt: cutoff(now, ANALYTICS_EVENT_RETENTION_DAYS) } },
  });
  const { count: activities } = await prisma.activity.deleteMany({
    where: { createdAt: { lt: cutoff(now, ACTIVITY_RETENTION_DAYS) } },
  });
  const { count: playHistory } = await prisma.playHistory.deleteMany({
    where: { playedAt: { lt: cutoff(now, PLAY_HISTORY_RETENTION_DAYS) } },
  });
  const { count: jobRuns } = await prisma.jobRun.deleteMany({
    where: { startedAt: { lt: cutoff(now, JOB_RUN_RETENTION_DAYS) } },
  });

  logger.info(
    {
      deletedErrorReports: errorReports,
      deletedReadNotifications: readNotifications,
      deletedPlayEvents: playEvents,
      deletedSongViews: songViews,
      deletedActivities: activities,
      deletedPlayHistory: playHistory,
      deletedJobRuns: jobRuns,
    },
    "jobs: retention-cleanup done"
  );
}
