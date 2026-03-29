import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const song = await prisma.song.findFirst({
      where: { id, userId },
      select: { lyrics: true, lyricsEdited: true },
    });

    if (!song) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      original: song.lyrics ?? null,
      edited: song.lyricsEdited ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const song = await prisma.song.findFirst({
      where: { id, userId },
    });

    if (!song) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const edited = typeof body.edited === "string" ? body.edited : null;

    const updated = await prisma.song.update({
      where: { id: song.id },
      data: { lyricsEdited: edited },
      select: { lyrics: true, lyricsEdited: true },
    });

    return NextResponse.json({
      original: updated.lyrics ?? null,
      edited: updated.lyricsEdited ?? null,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
