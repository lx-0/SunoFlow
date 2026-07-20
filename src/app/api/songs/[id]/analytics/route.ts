import { NextResponse } from "next/server";
import { authRoute } from "@/lib/route-handler";
import { notFound } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export const GET = authRoute<{ id: string }>(
  async (_request, { auth, params }) => {
    const song = await prisma.song.findFirst({
      where: { id: params.id, userId: auth.userId },
      select: {
        id: true,
        title: true,
        playCount: true,
        viewCount: true,
        duration: true,
        isPublic: true,
      },
    });

    if (!song) {
      return notFound("Song not found");
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const viewsRaw = await prisma.$queryRaw<Array<{ date: Date; count: bigint }>>`
      SELECT DATE("viewedAt") as date, COUNT(*)::bigint as count
      FROM "SongView"
      WHERE "songId" = ${params.id}
        AND "viewedAt" >= ${sevenDaysAgo}
      GROUP BY DATE("viewedAt")
      ORDER BY date ASC
    `;

    const now = new Date();
    const viewMap = new Map(
      viewsRaw.map((r) => [new Date(r.date).toISOString().slice(0, 10), Number(r.count)]),
    );
    const views7d: Array<{ date: string; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      views7d.push({ date: key, count: viewMap.get(key) ?? 0 });
    }

    return NextResponse.json({
      songId: song.id,
      title: song.title ?? "Untitled",
      totalPlays: song.playCount,
      totalViews: song.viewCount,
      isPublic: song.isPublic,
      views7d,
    });
  },
  { route: "/api/songs/[id]/analytics" },
);
