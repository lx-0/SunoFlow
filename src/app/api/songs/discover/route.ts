import { NextResponse } from "next/server";
import { CacheControl } from "@/lib/cache";
import { discoverSongs } from "@/lib/discovery";
import {
  discoverSongsQuerySchema,
  toDiscoverSongsQuery,
} from "@/lib/discovery/request";
import { anonRoute } from "@/lib/route-handler";

export const GET = anonRoute(
  async (_request, { query }) => {
    const result = await discoverSongs(toDiscoverSongsQuery(query));

    return NextResponse.json(result, {
      headers: { "Cache-Control": CacheControl.publicShort },
    });
  },
  {
    rateLimit: { action: "discover", limit: 30, windowMs: 60_000 },
    query: discoverSongsQuerySchema,
  },
);
