import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const { id } = await params;

    const song = await prisma.song.updateMany({
      where: { id, userId },
      data: { playCount: { increment: 1 } },
    });

    if (song.count === 0) {
      return NextResponse.json({ error: "Song not found" }, { status: 404 });
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
