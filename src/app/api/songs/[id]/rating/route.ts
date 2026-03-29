import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import { invalidateByPrefix } from "@/lib/cache";

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
      select: { rating: true, ratingNote: true },
    });

    if (!song) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({
      rating: song.rating,
      ratingNote: song.ratingNote,
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
      where: { id, userId: userId },
    });

    if (!song) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const body = await request.json();
    const stars = body.stars;
    const rawNote = typeof body.note === "string" ? body.note.trim() : null;
    const note = rawNote && rawNote.length > 500 ? rawNote.slice(0, 500) : rawNote;

    if (typeof stars !== "number" || stars < 0 || stars > 5 || !Number.isInteger(stars)) {
      return NextResponse.json({ error: "stars must be an integer 0-5", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const updated = await prisma.song.update({
      where: { id: song.id },
      data: {
        rating: stars === 0 ? null : stars,
        ratingNote: stars === 0 ? null : (note || null),
      },
    });

    invalidateByPrefix(`dashboard-stats:${userId}`);

    return NextResponse.json({
      rating: updated.rating,
      ratingNote: updated.ratingNote,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
