import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, logAdminAction } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const { error, user: admin } = await requireAdmin();
  if (error) return error;

  const report = await prisma.report.findUnique({
    where: { id: params.id },
    include: { song: { select: { id: true, userId: true } } },
  });

  if (!report) {
    return NextResponse.json({ error: "Report not found" }, { status: 404 });
  }

  const body = await request.json();
  const { action, adminNote } = body;

  if (!action || !["dismiss", "hide_song", "warn_user"].includes(action)) {
    return NextResponse.json(
      { error: "action must be one of: dismiss, hide_song, warn_user" },
      { status: 400 }
    );
  }

  const updates: Record<string, unknown> = {
    adminNote: adminNote?.trim()?.slice(0, 1000) || null,
    updatedAt: new Date(),
  };

  if (action === "dismiss") {
    updates.status = "dismissed";
    await logAdminAction(admin!.id, "dismiss_report", report.id, `Dismissed report for song ${report.songId}`);
  } else if (action === "hide_song") {
    updates.status = "actioned";
    // Hide the song
    await prisma.song.update({
      where: { id: report.songId },
      data: { isHidden: true, isPublic: false },
    });
    await logAdminAction(admin!.id, "hide_song", report.songId, `Hidden song via report ${report.id}`);
  } else if (action === "warn_user") {
    updates.status = "actioned";
    // Log the warning (actual notification system is a placeholder)
    console.log(`[MODERATION] Warning issued to user ${report.song.userId} regarding song ${report.songId}`);
    await logAdminAction(admin!.id, "warn_user", report.song.userId, `Warned user via report ${report.id} for song ${report.songId}`);
  }

  const updated = await prisma.report.update({
    where: { id: params.id },
    data: updates,
  });

  return NextResponse.json(updated);
}
