import { NextResponse } from "next/server";
import { optionalAuthRoute } from "@/lib/route-handler";
import { CacheControl, CacheTTL, cached, cacheKey } from "@/lib/cache";
import { withTiming } from "@/lib/timing";
import { discoverFeedQuerySchema } from "@/lib/discovery/request";
import {
  buildAnonymousFeed,
  buildPersonalizedFeed,
  paginate,
} from "@/lib/feed";

export const GET = withTiming(
  "/api/discover",
  optionalAuthRoute(
    async (_request, { auth, query }) => {
      const { page, tag, mood } = query;
      const filters = { tag, mood };

      if (!auth.userId) {
        const key = cacheKey("discover-anon-v1", tag || "any", mood || "any");
        const items = await cached(key, () => buildAnonymousFeed(filters), CacheTTL.DISCOVER);
        return NextResponse.json(
          { ...paginate(items, page), strategy: "trending_fallback" },
          { headers: { "Cache-Control": CacheControl.publicShort } }
        );
      }

      const hourBucket = Math.floor(Date.now() / (1000 * 60 * 5));
      const key = cacheKey(
        "discover-feed-v1",
        auth.userId,
        tag || "any",
        mood || "any",
        String(hourBucket)
      );

      const { items, strategy } = await cached(
        key,
        () => buildPersonalizedFeed(auth.userId!, filters),
        CacheTTL.DISCOVER
      );

      return NextResponse.json(
        { ...paginate(items, page), strategy },
        { headers: { "Cache-Control": CacheControl.privateShort } }
      );
    },
    { query: discoverFeedQuerySchema, route: "/api/discover" }
  )
);
