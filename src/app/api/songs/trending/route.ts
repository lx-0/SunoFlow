import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/error-logger";
import { CacheControl } from "@/lib/cache";
import { rateLimited, internalError } from "@/lib/api-error";
import { withTiming } from "@/lib/timing";
import { acquireAnonRateLimitSlot } from "@/lib/rate-limit";
import { trendingSongs } from "@/lib/discovery";
import {
  parseQueryParams,
  zLimitParam,
  zOffsetParam,
  zTrimmedParam,
  zEnumParam,
} from "@/lib/query-params";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 60;

const trendingQuery = z.object({
  sort: zEnumParam(["trending", "popular"] as const, "trending"),
  limit: zLimitParam(20, 100),
  offset: zOffsetParam(),
  genre: zTrimmedParam,
  mood: zTrimmedParam,
});

async function handleGET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { acquired } = await acquireAnonRateLimitSlot(
      ip,
      "trending",
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!acquired) {
      return rateLimited(
        "Too many requests. Try again in a minute.",
        undefined,
        { "Retry-After": "60" },
      );
    }

    const parsed = parseQueryParams(request.nextUrl.searchParams, trendingQuery);
    if (parsed.error) return parsed.error;

    const result = await trendingSongs(parsed.data);

    return NextResponse.json(result, {
      headers: { "Cache-Control": CacheControl.publicShort },
    });
  } catch (error) {
    logServerError("songs-trending", error, { route: "/api/songs/trending" });
    return internalError();
  }
}

export const GET = withTiming("/api/songs/trending", handleGET);
