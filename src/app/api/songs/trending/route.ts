import { NextResponse } from "next/server";
import { CacheControl } from "@/lib/cache";
import { trendingSongs } from "@/lib/discovery";
import { trendingSongsQuerySchema } from "@/lib/discovery/request";
import { anonRoute } from "@/lib/route-handler";

export const GET = anonRoute(
  async (_request, { query }) => {
    const result = await trendingSongs(query);

    return NextResponse.json(result, {
      headers: { "Cache-Control": CacheControl.publicShort },
    });
  },
  {
    rateLimit: { action: "trending", limit: 60, windowMs: 60_000 },
    query: trendingSongsQuerySchema,
  },
);
