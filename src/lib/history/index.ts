import { prisma } from "@/lib/prisma";
import { cursorPaginate } from "@/lib/pagination";
import { recordDailyActivity, checkStreakMilestones } from "@/lib/streaks";
import type { Prisma } from "@prisma/client";

const DEFAULT_PLAY_HISTORY_RETENTION = 50;
const DEDUP_WINDOW_MS = 5_000;
const PLAY_HISTORY_RETENTION_DAYS = (() => {
  const raw = process.env.PLAY_HISTORY_RETENTION;
  if (!raw) return DEFAULT_PLAY_HISTORY_RETENTION;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed < 0) return DEFAULT_PLAY_HISTORY_RETENTION;
  if (parsed === 0) return null;
  return parsed;
})();

const historySongSelect = {
  id: true,
  title: true,
  imageUrl: true,
  audioUrl: true,
  duration: true,
  lyrics: true,
  generationStatus: true,
  archivedAt: true,
} as const;

export interface ListPlayHistoryOptions {
  limit: number;
  cursor?: string;
  dateFrom?: string;
  dateTo?: string;
}

function parseValidDate(value?: string): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function buildDateRangeFilter(
  dateFrom?: string,
  dateTo?: string,
  now = new Date(),
): Prisma.DateTimeFilter | null {
  const from = parseValidDate(dateFrom);
  const to = parseValidDate(dateTo);
  const retentionFrom = PLAY_HISTORY_RETENTION_DAYS
    ? new Date(now.getTime() - PLAY_HISTORY_RETENTION_DAYS * 24 * 60 * 60 * 1000)
    : null;

  const gte =
    from && retentionFrom
      ? new Date(Math.max(from.getTime(), retentionFrom.getTime()))
      : from ?? retentionFrom;

  const filter: Prisma.DateTimeFilter = {};
  if (gte) filter.gte = gte;
  if (to) {
    to.setHours(23, 59, 59, 999);
    filter.lte = to;
  }

  return Object.keys(filter).length > 0 ? filter : null;
}

export function buildPlayHistoryWhere(
  userId: string,
  options: Pick<ListPlayHistoryOptions, "dateFrom" | "dateTo">,
  now = new Date(),
): Prisma.PlayHistoryWhereInput {
  const playedAt = buildDateRangeFilter(options.dateFrom, options.dateTo, now);
  return {
    userId,
    ...(playedAt ? { playedAt } : {}),
  };
}

export async function listPlayHistory(
  userId: string,
  options: ListPlayHistoryOptions,
) {
  const { limit, cursor } = options;
  const where = buildPlayHistoryWhere(userId, options);

  const [items, [{ count: rawTotal }]] = await Promise.all([
    prisma.playHistory.findMany({
      where,
      orderBy: { playedAt: "desc" },
      take: limit + 1,
      ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
      include: { song: { select: historySongSelect } },
    }),
    prisma.playHistory.count({ where }).then((count) => [{ count: BigInt(count) }]),
  ]);

  const page = cursorPaginate(items, limit);

  return { ...page, total: Number(rawTotal) };
}

export type RecordPlayResult =
  | { status: "not_found" }
  | { status: "deduped" }
  | { status: "recorded"; entry: { id: string; userId: string; songId: string; playedAt: Date } };

export async function recordPlay(
  userId: string,
  songId: string,
): Promise<RecordPlayResult> {
  const song = await prisma.song.findFirst({
    where: { id: songId, userId },
    select: { id: true },
  });
  if (!song) {
    return { status: "not_found" };
  }

  const cutoff = new Date(Date.now() - DEDUP_WINDOW_MS);
  const recent = await prisma.playHistory.findFirst({
    where: { userId, songId, playedAt: { gte: cutoff } },
    select: { id: true },
  });
  if (recent) {
    return { status: "deduped" };
  }

  const entry = await prisma.playHistory.create({
    data: { userId, songId },
  });

  recordDailyActivity(userId)
    .then((streak) => checkStreakMilestones(userId, streak))
    .catch(() => {});

  if (PLAY_HISTORY_RETENTION_DAYS !== null) {
    prisma.playHistory
      .findMany({
        where: { userId },
        orderBy: { playedAt: "desc" },
        skip: PLAY_HISTORY_RETENTION_DAYS,
        select: { id: true },
      })
      .then((old) => {
        if (old.length === 0) return;
        return prisma.playHistory.deleteMany({
          where: { id: { in: old.map((e) => e.id) } },
        });
      })
      .catch(() => {});
  }

  return { status: "recorded", entry };
}

export async function clearHistory(userId: string): Promise<void> {
  await prisma.playHistory.deleteMany({ where: { userId } });
}
