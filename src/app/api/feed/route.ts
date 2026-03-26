import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 20;

const VALID_TYPES = ["song_created", "song_favorited", "song_commented", "new_follower", "playlist_created"] as const;
type ActivityType = (typeof VALID_TYPES)[number];

function filterActivity(a: {
  type: string;
  song?: { isPublic: boolean; isHidden: boolean; archivedAt: Date | null; generationStatus: string } | null;
  playlist?: { isPublic: boolean } | null;
}) {
  if (a.type === "song_created" || a.type === "song_favorited" || a.type === "song_commented") {
    return (
      a.song &&
      a.song.isPublic &&
      !a.song.isHidden &&
      !a.song.archivedAt &&
      a.song.generationStatus === "ready"
    );
  }
  if (a.type === "playlist_created") {
    return a.playlist && a.playlist.isPublic;
  }
  if (a.type === "new_follower") {
    return true;
  }
  return false;
}

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
    const mode = searchParams.get("mode") === "discover" ? "discover" : "following";
    const typeParam = searchParams.get("type") ?? "all";
    const typeFilter: ActivityType[] =
      typeParam !== "all" && VALID_TYPES.includes(typeParam as ActivityType)
        ? [typeParam as ActivityType]
        : [...VALID_TYPES];

    // Get the list of users this person follows
    const following = await prisma.follow.findMany({
      where: { followerId: userId },
      select: { followingId: true },
    });

    const followingIds = following.map((f) => f.followingId);

    if (mode === "following" && followingIds.length === 0) {
      return NextResponse.json({
        items: [],
        pagination: { page, totalPages: 0, total: 0, hasMore: false },
      });
    }

    const where =
      mode === "following"
        ? { userId: { in: followingIds }, type: { in: typeFilter } }
        : {
            // Discover: exclude the current user and followed users
            userId: { notIn: [userId, ...followingIds] },
            type: { in: typeFilter },
          };

    const [activities, total] = await Promise.all([
      prisma.activity.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: PAGE_SIZE,
        select: {
          id: true,
          type: true,
          createdAt: true,
          metadata: true,
          user: { select: { id: true, name: true, image: true } },
          song: {
            select: {
              id: true,
              publicSlug: true,
              title: true,
              imageUrl: true,
              duration: true,
              tags: true,
              isPublic: true,
              isHidden: true,
              archivedAt: true,
              generationStatus: true,
            },
          },
          playlist: {
            select: {
              id: true,
              name: true,
              slug: true,
              isPublic: true,
              _count: { select: { songs: true } },
            },
          },
        },
      }),
      prisma.activity.count({ where }),
    ]);

    // For new_follower events, fetch the followed user info from metadata
    const newFollowerActivities = activities.filter(
      (a) => a.type === "new_follower" && a.metadata && typeof a.metadata === "object" && "followingId" in (a.metadata as Record<string, unknown>)
    );
    const followingUserIds = newFollowerActivities.map(
      (a) => (a.metadata as Record<string, unknown>).followingId as string
    );
    const followedUsers =
      followingUserIds.length > 0
        ? await prisma.user.findMany({
            where: { id: { in: followingUserIds } },
            select: { id: true, name: true, image: true, username: true },
          })
        : [];
    const followedUserMap = Object.fromEntries(followedUsers.map((u) => [u.id, u]));

    const items = activities
      .filter(filterActivity)
      .map((a) => ({
        id: a.id,
        type: a.type,
        createdAt: a.createdAt,
        user: a.user,
        song: a.song
          ? {
              id: a.song.id,
              publicSlug: a.song.publicSlug,
              title: a.song.title,
              imageUrl: a.song.imageUrl,
              duration: a.song.duration,
              tags: a.song.tags,
            }
          : null,
        playlist: a.playlist
          ? {
              id: a.playlist.id,
              name: a.playlist.name,
              slug: a.playlist.slug,
              songCount: a.playlist._count.songs,
            }
          : null,
        followedUser:
          a.type === "new_follower" && a.metadata && typeof a.metadata === "object" && "followingId" in (a.metadata as Record<string, unknown>)
            ? (followedUserMap[(a.metadata as Record<string, unknown>).followingId as string] ?? null)
            : null,
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
