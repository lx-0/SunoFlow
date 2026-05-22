import { authRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { getUserOrNotFound } from "@/lib/profile/user";

export const GET = authRoute(async (_request, { auth }) => {
  const [userResult, totalSongs, totalFavorites, totalPlaylists, totalTemplates] =
    await Promise.all([
      getUserOrNotFound(auth.userId, {
        createdAt: true,
        lastLoginAt: true,
        _count: { select: { followers: true, following: true } },
      }),
      prisma.song.count({ where: { userId: auth.userId } }),
      prisma.song.count({ where: { userId: auth.userId, isFavorite: true } }),
      prisma.playlist.count({ where: { userId: auth.userId } }),
      prisma.promptTemplate.count({ where: { userId: auth.userId } }),
    ]);

  if (!userResult.ok) {
    return userResult.response;
  }

  return Response.json({
    totalSongs,
    totalFavorites,
    totalPlaylists,
    totalTemplates,
    followersCount: userResult.user._count.followers,
    followingCount: userResult.user._count.following,
    memberSince: userResult.user.createdAt,
    lastLoginAt: userResult.user.lastLoginAt,
  });
}, { route: "/api/profile/stats" });
