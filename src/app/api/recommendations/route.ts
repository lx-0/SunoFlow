import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth";
import { logServerError } from "@/lib/error-logger";
import { cached, cacheKey, CacheTTL } from "@/lib/cache";
import { withTiming } from "@/lib/timing";
import { getRecommendations } from "@/lib/recommendations";
import { parseQueryParams, zLimitParam, zCsvParam } from "@/lib/query-params";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const recommendationsQuery = z.object({
  limit: zLimitParam(DEFAULT_LIMIT, MAX_LIMIT),
  exclude: zCsvParam,
});

async function handleGET(request: NextRequest) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const parsed = parseQueryParams(
      request.nextUrl.searchParams,
      recommendationsQuery,
    );
    if (parsed.error) return parsed.error;
    const query = parsed.data;

    const excludeIds = new Set(query.exclude);

    const hourBucket = Math.floor(Date.now() / (1000 * 60 * 60));
    const key = cacheKey(
      "recommendations-v1",
      userId,
      String(hourBucket),
      String(query.limit),
    );

    const result = await cached(
      key,
      () => getRecommendations({ userId, limit: query.limit, excludeIds }),
      CacheTTL.RECOMMENDATIONS,
    );

    return NextResponse.json(result);
  } catch (error) {
    logServerError("recommendations", error, {
      route: "/api/recommendations",
    });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}

export const GET = withTiming("/api/recommendations", handleGET);
