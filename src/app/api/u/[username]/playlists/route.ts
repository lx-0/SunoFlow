import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(
  request: Request,
  { params }: { params: { username: string } }
) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

    const user = await prisma.user.findUnique({
      where: { username: params.username },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const [playlists, total] = await Promise.all([
      prisma.playlist.findMany({
        where: { userId: user.id, isPublic: true },
        orderBy: { updatedAt: "desc" },
        skip: (page - 1) * PAGE_SIZE,
        take: PAGE_SIZE,
        select: {
          id: true,
          name: true,
          description: true,
          slug: true,
          createdAt: true,
          _count: { select: { songs: true } },
          songs: {
            take: 1,
            orderBy: { position: "asc" },
            select: {
              song: { select: { imageUrl: true } },
            },
          },
        },
      }),
      prisma.playlist.count({
        where: { userId: user.id, isPublic: true },
      }),
    ]);

    return NextResponse.json({
      playlists: playlists.map((pl) => ({
        id: pl.id,
        name: pl.name,
        description: pl.description,
        slug: pl.slug,
        songCount: pl._count.songs,
        coverImage: pl.songs[0]?.song.imageUrl ?? null,
        createdAt: pl.createdAt,
      })),
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        hasMore: page * PAGE_SIZE < total,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
