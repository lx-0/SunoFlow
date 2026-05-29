import { NextResponse } from "next/server";
import { authDataRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSmartPlaylists } from "@/lib/smart-playlists";
import { CacheControl } from "@/lib/cache";

export const GET = authDataRoute(async (_request, { auth }) => {
  await ensureDefaultSmartPlaylists(auth.userId);

  const playlists = await prisma.playlist.findMany({
    where: { userId: auth.userId, isSmartPlaylist: true },
    include: { _count: { select: { songs: true } } },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ playlists }, {
    headers: { "Cache-Control": CacheControl.privateShort },
  });
}, { route: "/api/smart-playlists" });
