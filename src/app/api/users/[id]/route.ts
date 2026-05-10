import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { cached, cacheKey, CacheTTL, CacheControl } from "@/lib/cache";
import { withTiming } from "@/lib/timing";
import { isFollowing } from "@/lib/follows";

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
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  try {
    const session = await auth();
    const viewerId = session?.user?.id ?? null;

    const user = await getPublicUserData(id);

    if (!user) {
      return NextResponse.json(
        { error: "User not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    const viewerFollowing = viewerId ? await isFollowing(viewerId, id) : false;

    return NextResponse.json(
      {
        id: user.id,
        name: user.name,
        image: user.image,
        createdAt: user.createdAt,
        followersCount: user._count.followers,
        followingCount: user._count.following,
        publicSongsCount: user._count.songs,
        isFollowing: viewerFollowing,
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
