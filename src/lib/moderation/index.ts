import { prisma } from "@/lib/prisma";
import { DEFAULT_PAGE_SIZE, offsetPagination, pageSkip } from "@/lib/pagination";
import { SELECT_USER_BRIEF } from "@/lib/prisma-selects";
import { logger } from "@/lib/logger";
import { logAdminAction } from "@/lib/auth";

// ── Types ───────────────────────────────────────────────────────────

const VALID_REASONS = ["offensive", "copyright", "spam", "other"] as const;
export type ReportReason = (typeof VALID_REASONS)[number];

const VALID_ACTIONS = ["dismiss", "hide_song", "delete_song", "warn_user"] as const;
export type ModerationAction = (typeof VALID_ACTIONS)[number];

export { VALID_REASONS, VALID_ACTIONS };

export type CreateReportInput = {
  songId?: string;
  playlistId?: string;
  reason: ReportReason;
  description?: string;
};

export type ResolveActionInput = {
  reportId: string;
  adminId: string;
  action: ModerationAction;
  adminNote?: string;
};

export type BulkActionInput = {
  reportIds: string[];
  adminId: string;
  action: ModerationAction;
};

export type BulkActionResult = {
  processed: number;
  errors: number;
  processedIds: string[];
};

export type ListReportsInput = {
  status: string;
  page: number;
};

type ReportWithSong = {
  id: string;
  songId: string | null;
  song: { id: string; userId: string } | null;
};

type ActionContext = {
  adminId: string;
  action: ModerationAction;
  report: ReportWithSong;
  bulk: boolean;
};

const INVALID_SONG_TARGET = { error: "INVALID_TARGET", message: "This report is not for a song" } as const;

async function executeAction({ adminId, action, report, bulk }: ActionContext) {
  if (action === "hide_song") {
    if (!report.songId || !report.song) return INVALID_SONG_TARGET;
    await prisma.song.update({
      where: { id: report.songId },
      data: { isHidden: true, isPublic: false },
    });
    await logAdminAction(adminId, "hide_song", report.songId, `${bulk ? "Bulk hide" : "Hidden song"} via report ${report.id}`);
    return null;
  }

  if (action === "delete_song") {
    if (!report.songId) return INVALID_SONG_TARGET;
    await prisma.song.delete({ where: { id: report.songId } });
    await logAdminAction(adminId, "delete_song", report.songId, `${bulk ? "Bulk delete" : "Deleted song"} via report ${report.id}`);
    return null;
  }

  if (action === "warn_user") {
    if (!report.song) return INVALID_SONG_TARGET;
    logger.info(
      { userId: report.song.userId, songId: report.songId, reportId: report.id },
      `moderation: ${bulk ? "bulk warning issued" : "warning issued to user"}`
    );
    await logAdminAction(
      adminId,
      "warn_user",
      report.song.userId,
      `${bulk ? "Bulk warn" : "Warned user"} via report ${report.id}${bulk ? "" : ` for song ${report.songId}`}`
    );
    return null;
  }

  if (action === "dismiss") {
    await logAdminAction(adminId, "dismiss_report", report.id, bulk ? "Bulk dismiss report" : `Dismissed report ${report.id}`);
  }
  return null;
}

// ── Report creation ─────────────────────────────────────────────────

export async function createReport(userId: string, input: CreateReportInput) {
  if (input.songId) {
    const song = await prisma.song.findUnique({
      where: { id: input.songId },
      select: { id: true, userId: true },
    });
    if (!song) return { error: "NOT_FOUND", message: "Song not found" } as const;
    if (song.userId === userId) return { error: "SELF_REPORT", message: "Cannot report your own song" } as const;

    const existing = await prisma.report.findFirst({
      where: { songId: input.songId, reporterId: userId },
      select: { id: true },
    });
    if (existing) return { error: "DUPLICATE", message: "You have already reported this song" } as const;
  } else {
    const playlist = await prisma.playlist.findUnique({
      where: { id: input.playlistId },
      select: { id: true, userId: true },
    });
    if (!playlist) return { error: "NOT_FOUND", message: "Playlist not found" } as const;
    if (playlist.userId === userId) return { error: "SELF_REPORT", message: "Cannot report your own playlist" } as const;

    const existing = await prisma.report.findFirst({
      where: { playlistId: input.playlistId, reporterId: userId },
      select: { id: true },
    });
    if (existing) return { error: "DUPLICATE", message: "You have already reported this playlist" } as const;
  }

  const report = await prisma.report.create({
    data: {
      songId: input.songId || null,
      playlistId: input.playlistId || null,
      reporterId: userId,
      reason: input.reason,
      description: input.description?.trim() || null,
    },
  });

  logger.info(
    { reportId: report.id, songId: input.songId, playlistId: input.playlistId, userId, reason: input.reason },
    "moderation: new report filed"
  );

  return { data: { id: report.id, status: "pending" } } as const;
}

// ── Report listing ──────────────────────────────────────────────────

export async function listReports({ status, page }: ListReportsInput) {
  const skip = pageSkip(page, DEFAULT_PAGE_SIZE);
  const where = status === "all" ? {} : { status };

  const [reports, total] = await Promise.all([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: DEFAULT_PAGE_SIZE,
      include: {
        song: {
          select: {
            id: true,
            title: true,
            imageUrl: true,
            audioUrl: true,
            isHidden: true,
            userId: true,
            user: { select: SELECT_USER_BRIEF },
          },
        },
        reporter: {
          select: SELECT_USER_BRIEF,
        },
      },
    }),
    prisma.report.count({ where }),
  ]);

  return { reports, ...offsetPagination(page, DEFAULT_PAGE_SIZE, total) };
}

export async function pendingReportCount() {
  return prisma.report.count({ where: { status: "pending" } });
}

// ── Single report action ────────────────────────────────────────────

export async function resolveReport({ reportId, adminId, action, adminNote }: ResolveActionInput) {
  const report = await prisma.report.findUnique({
    where: { id: reportId },
    include: { song: { select: { id: true, userId: true } } },
  });

  if (!report) return { error: "NOT_FOUND", message: "Report not found" } as const;

  const updates: Record<string, unknown> = {
    adminNote: adminNote?.trim()?.slice(0, 1000) || null,
    updatedAt: new Date(),
  };

  const actionResult = await executeAction({ adminId, action, report, bulk: false });
  if (actionResult) return actionResult;
  updates.status = action === "dismiss" ? "dismissed" : "actioned";

  const updated = await prisma.report.update({ where: { id: reportId }, data: updates });
  return { data: updated } as const;
}

// ── Bulk report action ──────────────────────────────────────────────

export async function bulkResolveReports({ reportIds, adminId, action }: BulkActionInput): Promise<BulkActionResult> {
  const reports = await prisma.report.findMany({
    where: { id: { in: reportIds }, status: "pending" },
    include: { song: { select: { id: true, userId: true } } },
  });

  const processed: string[] = [];
  const errors: string[] = [];

  for (const report of reports) {
    try {
      const newStatus = action === "dismiss" ? "dismissed" : "actioned";
      const updates: Record<string, unknown> = { status: newStatus, updatedAt: new Date() };
      const actionResult = await executeAction({ adminId, action, report, bulk: true });
      if (actionResult) { errors.push(report.id); continue; }

      await prisma.report.update({ where: { id: report.id }, data: updates });
      processed.push(report.id);
    } catch (err) {
      errors.push(report.id);
      logger.error({ reportId: report.id, err }, "bulk moderation action failed");
    }
  }

  return { processed: processed.length, errors: errors.length, processedIds: processed };
}
