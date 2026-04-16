import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ username: string }> }
) {
  const { username } = await params;
  try {
    const session = await auth();
    const viewerId = session?.user?.id ?? null;

    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        name: true,
        username: true,
        image: true,
        avatarUrl: true,
        bannerUrl: true,
        bio: true,
        featuredSongId: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            songs: { where: { isPublic: true, isHidden: false, archivedAt: null, generationStatus: "ready" } },
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    let isFollowing = false;
    if (viewerId && viewerId !== user.id) {
      const follow = await prisma.follow.findUnique({
        where: {
          followerId_followingId: { followerId: viewerId, followingId: user.id },
        },
        select: { id: true },
      });
      isFollowing = !!follow;
    }

    // Fetch featured song if set
    let featuredSong = null;
    if (user.featuredSongId) {
      featuredSong = await prisma.song.findFirst({
        where: {
          id: user.featuredSongId,
          userId: user.id,
          isPublic: true,
          isHidden: false,
          archivedAt: null,
        },
        select: {
          id: true,
          title: true,
          imageUrl: true,
          audioUrl: true,
          duration: true,
          tags: true,
          publicSlug: true,
        },
      });
    }

    // Compute total play count across public songs
    const playStats = await prisma.song.aggregate({
      where: {
        userId: user.id,
        isPublic: true,
        isHidden: false,
        archivedAt: null,
      },
      _sum: { playCount: true },
    });

    return NextResponse.json({
      id: user.id,
      name: user.name,
      username: user.username,
      image: user.image,
      avatarUrl: user.avatarUrl,
      bannerUrl: user.bannerUrl,
      bio: user.bio,
      createdAt: user.createdAt,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      publicSongsCount: user._count.songs,
      totalPlays: playStats._sum.playCount ?? 0,
      featuredSong,
      isFollowing,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
