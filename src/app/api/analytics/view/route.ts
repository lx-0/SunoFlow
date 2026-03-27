import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { internalError } from "@/lib/api-error";
import { logServerError } from "@/lib/error-logger";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { songId } = body;

    if (!songId || typeof songId !== "string") {
      return NextResponse.json(
        { error: "songId is required", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    // Only track views on public, non-hidden, non-archived songs
    const song = await prisma.song.findFirst({
      where: { id: songId, isPublic: true, isHidden: false, archivedAt: null },
      select: { id: true },
    });

    if (!song) {
      return NextResponse.json(
        { error: "Song not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    await prisma.$transaction([
      prisma.songView.create({ data: { songId } }),
      prisma.song.update({
        where: { id: songId },
        data: { viewCount: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (error) {
    logServerError("POST /api/analytics/view", error, { route: "/api/analytics/view" });
    return internalError();
  }
}
