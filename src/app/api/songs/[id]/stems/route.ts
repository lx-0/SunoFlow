import { NextResponse } from "next/server";
import { authRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";

export const GET = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    const song = await prisma.song.findUnique({ where: { id: params.id } });
    if (!song || song.userId !== auth.userId) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const stems = await prisma.song.findMany({
      where: { parentSongId: params.id, userId: auth.userId },
      select: {
        id: true,
        title: true,
        audioUrl: true,
        generationStatus: true,
        duration: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ stems });
  },
  { route: "/api/songs/[id]/stems" },
);
