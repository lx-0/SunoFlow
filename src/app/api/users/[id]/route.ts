import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cached, cacheKey, CacheTTL, CacheControl } from "@/lib/cache";
import { withTiming } from "@/lib/timing";

// Public user data is the same for all viewers — cache it shared.
// The isFollowing flag is fetched separately (per-viewer, not cached).
async function getPublicUserData(userId: string) {
  return cached(
    cacheKey("user-profile", userId),
    () =>
      prisma.user.findUnique({
        where: { id: userId },
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
      }),
    CacheTTL.USER_PROFILE
  );
}

async function handleGET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    const viewerId = session?.user?.id ?? null;

    const user = await getPublicUserData(params.id);

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

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        publicSongsCount: user._count.songs,
        isFollowing,
      },
      { headers: { "Cache-Control": CacheControl.privateShort } }
    );
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export const GET = withTiming("/api/users/[id]", handleGET);
