import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    report: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
    song: {
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  logAdminAction: vi.fn(),
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
  },
}));

import { prisma } from "@/lib/prisma";
import { logAdminAction } from "@/lib/auth";
import { bulkResolveReports, resolveReport } from "./index";

describe("moderation actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns INVALID_TARGET when resolving hide_song on non-song report", async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: "r1",
      songId: null,
      song: null,
    } as never);

    const result = await resolveReport({
      reportId: "r1",
      adminId: "admin-1",
      action: "hide_song",
    });

    expect(result).toEqual({
      error: "INVALID_TARGET",
      message: "This report is not for a song",
    });
    expect(prisma.song.update).not.toHaveBeenCalled();
    expect(prisma.report.update).not.toHaveBeenCalled();
  });

  it("resolves dismiss by updating report status and logging admin action", async () => {
    vi.mocked(prisma.report.findUnique).mockResolvedValue({
      id: "r2",
      songId: "s2",
      song: { id: "s2", userId: "u2" },
    } as never);
    vi.mocked(prisma.report.update).mockResolvedValue({ id: "r2", status: "dismissed" } as never);

    const result = await resolveReport({
      reportId: "r2",
      adminId: "admin-1",
      action: "dismiss",
      adminNote: " resolved ",
    });

    expect(logAdminAction).toHaveBeenCalledWith("admin-1", "dismiss_report", "r2", "Dismissed report r2");
    expect(prisma.report.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "r2" },
        data: expect.objectContaining({ status: "dismissed", adminNote: "resolved" }),
      })
    );
    expect(result).toEqual({ data: { id: "r2", status: "dismissed" } });
  });

  it("bulk processing records per-report errors without aborting the batch", async () => {
    vi.mocked(prisma.report.findMany).mockResolvedValue([
      { id: "bad", songId: null, song: null },
      { id: "good", songId: "song-1", song: { id: "song-1", userId: "u1" } },
    ] as never);
    vi.mocked(prisma.report.update).mockResolvedValue({} as never);

    const result = await bulkResolveReports({
      reportIds: ["bad", "good"],
      adminId: "admin-1",
      action: "hide_song",
    });

    expect(prisma.song.update).toHaveBeenCalledTimes(1);
    expect(prisma.report.update).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      processed: 1,
      errors: 1,
      processedIds: ["good"],
    });
  });
});
