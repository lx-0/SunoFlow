import { NextResponse } from "next/server";
import { authRoute } from "@/lib/route-handler";
import { requireOwnedSong } from "@/lib/songs/ownership";
import { prisma } from "@/lib/prisma";

export const GET = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    const { error } = await requireOwnedSong(params.id, auth.userId);
    if (error) return error;

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
