import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { logServerError } from "@/lib/error-logger";
import { CacheControl } from "@/lib/cache";
import { acquireAnonRateLimitSlot } from "@/lib/rate-limit";
import { discoverSongs } from "@/lib/discovery";
import {
  parseQueryParams,
  zPageParam,
  zIntParam,
  zTrimmedParam,
  zEnumParam,
} from "@/lib/query-params";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 30;

const discoverQuery = z.object({
  page: zPageParam(),
  sortBy: zEnumParam(
    ["newest", "highest_rated", "most_played"] as const,
    "newest",
  ),
  tag: zTrimmedParam,
  mood: zTrimmedParam,
  tempoMin: zIntParam,
  tempoMax: zIntParam,
});

export async function GET(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "unknown";

    const { acquired } = await acquireAnonRateLimitSlot(
      ip,
      "discover",
      RATE_LIMIT_MAX,
      RATE_LIMIT_WINDOW_MS,
    );
    if (!acquired) {
      return NextResponse.json(
        { error: "Too many requests", code: "RATE_LIMIT" },
        { status: 429, headers: { "Retry-After": "60" } },
      );
    }

    const parsed = parseQueryParams(request.nextUrl.searchParams, discoverQuery);
    if (parsed.error) return parsed.error;
    const query = parsed.data;

    const result = await discoverSongs({
      sortBy: query.sortBy,
      tag: query.tag,
      mood: query.mood,
      tempoMin: query.tempoMin ?? null,
      tempoMax: query.tempoMax ?? null,
      page: query.page,
    });

    return NextResponse.json(result, {
      headers: { "Cache-Control": CacheControl.publicShort },
    });
  } catch (error) {
    logServerError("songs-discover", error, { route: "/api/songs/discover" });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 },
    );
  }
}
