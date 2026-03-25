import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

export async function GET(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Authentication required", code: "UNAUTHORIZED" },
        { status: 401 }
      );
    }
    const userId = session.user.id;

    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const skip = (page - 1) * PAGE_SIZE;

    // Get the list of users this person follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    if (following.length === 0) {
      return NextResponse.json({
        items: [],
        pagination: { page, totalPages: 0, total: 0, hasMore: false },
      });
    }

    const followingIds = following.map((f) => f.followingId);

    // Fetch recent songs published by followed users
    const [songs, total] = await Promise.all([
      prisma.song.findMany({
        where: {
          userId: { in: followingIds },
          isPublic: true,
          isHidden: false,
          archivedAt: null,
          generationStatus: "complete",
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          publicSlug: true,
          title: true,
          imageUrl: true,
          duration: true,
          tags: true,
          createdAt: true,
          user: { select: { id: true, name: true, image: true } },
        },
      }),
      prisma.song.count({
        where: {
          userId: { in: followingIds },
          isPublic: true,
          isHidden: false,
          archivedAt: null,
          generationStatus: "complete",
        },
      }),
    ]);

    const items = songs.map((song) => ({
      type: "new_song" as const,
      id: `song-${song.id}`,
      createdAt: song.createdAt,
      user: song.user,
      song: {
        id: song.id,
        publicSlug: song.publicSlug,
        title: song.title,
        imageUrl: song.imageUrl,
        duration: song.duration,
        tags: song.tags,
      },
    }));

    return NextResponse.json({
      items,
      pagination: {
        page,
        totalPages: Math.ceil(total / PAGE_SIZE),
        total,
        hasMore: skip + PAGE_SIZE < total,
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
