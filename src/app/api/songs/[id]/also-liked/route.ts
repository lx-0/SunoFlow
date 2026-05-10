import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute } from "@/lib/route-handler";
import { cached, cacheKey, CacheTTL } from "@/lib/cache";
import { getAlsoLiked } from "@/lib/recommendations";
import { zLimitParam } from "@/lib/query-params";

const alsoLikedQuery = z.object({
  limit: zLimitParam(8, 8),
});

export const GET = authRoute<{ id: string }, undefined, z.infer<typeof alsoLikedQuery>>(
  async (_request, { auth, params, query }) => {
    const key = cacheKey("also-liked", auth.userId, params.id, String(query.limit));
    const result = await cached(
      key,
      () => getAlsoLiked(params.id, auth.userId, query.limit),
      CacheTTL.RECOMMENDATIONS,
    );

    if (result === null) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    return NextResponse.json({ songs: result, total: result.length });
  },
  { route: "/api/songs/[id]/also-liked", query: alsoLikedQuery },
);
