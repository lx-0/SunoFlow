import { NextResponse } from "next/server";
import { authRoute } from "@/lib/route-handler";
import { listSmartPlaylistsWithCounts } from "@/lib/smart-playlists";
import { CacheControl } from "@/lib/cache";

export const GET = authRoute(async (_request, { auth }) => {
  // Shared with the /playlists page so the virtual "archive" count matches
  // (the join _count is always 0 for archive — see listSmartPlaylistsWithCounts).
  const playlists = await listSmartPlaylistsWithCounts(auth.userId);

  return NextResponse.json({ playlists }, {
    headers: { "Cache-Control": CacheControl.privateShort },
  });
}, { route: "/api/smart-playlists" });
