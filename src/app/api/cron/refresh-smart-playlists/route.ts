import { NextRequest, NextResponse } from "next/server";
import { refreshStalePlaylists } from "@/lib/smart-playlists";
import { logger } from "@/lib/logger";
import { logServerError } from "@/lib/error-logger";

/**
 * POST /api/cron/refresh-smart-playlists
 *
 * Refreshes all stale smart playlists across all users.
 * - Time-based playlists (new_this_week, mood) refresh daily
 * - Personalized playlists (top_hits, similar_to) refresh weekly
 *
 * Protected by CRON_SECRET bearer token.
 * Should be called on a daily schedule via Railway cron or an external scheduler.
 */
export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized", code: "UNAUTHORIZED" }, { status: 401 });
  }

  try {
    const { refreshed, skipped } = await refreshStalePlaylists();

    logger.info(
      { refreshed, skipped },
      "refresh-smart-playlists: cron run complete"
    );

    return NextResponse.json({ refreshed, skipped });
  } catch (error) {
    logServerError("refresh-smart-playlists", error, {
      route: "/api/cron/refresh-smart-playlists",
    });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
