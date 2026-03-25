import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const viewerId = session?.user?.id ?? null;

    const user = await prisma.user.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        name: true,
        image: true,
        createdAt: true,
        _count: {
          select: {
            followers: true,
            following: true,
            songs: { where: { isPublic: true, isHidden: false, archivedAt: null } },
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
    if (viewerId && viewerId !== params.id) {
      const follow = await prisma.follow.findUnique({
        where: { followerId_followingId: { followerId: viewerId, followingId: params.id } },
        select: { id: true },
      });
      isFollowing = !!follow;
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      image: user.image,
      createdAt: user.createdAt,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      publicSongsCount: user._count.songs,
      isFollowing,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
