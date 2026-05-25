import { NextResponse } from "next/server";
import { CacheControl } from "@/lib/cache";
import { discoverPlaylists } from "@/lib/discovery";
import {
  discoverPlaylistsQuerySchema,
  toDiscoverPlaylistsQuery,
} from "@/lib/discovery/request";
import { anonRoute } from "@/lib/route-handler";

export const GET = anonRoute(
  async (_request, { query }) => {
    const result = await discoverPlaylists(toDiscoverPlaylistsQuery(query));

    return NextResponse.json(result, {
      headers: { "Cache-Control": CacheControl.publicShort },
    });
  },
  {
    rateLimit: { action: "playlist-discover", limit: 30, windowMs: 60_000 },
    query: discoverPlaylistsQuerySchema,
  },
);
