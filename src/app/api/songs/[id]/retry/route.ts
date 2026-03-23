import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { generateSong, SunoApiError } from "@/lib/sunoapi";
import { prisma } from "@/lib/prisma";
import { acquireRateLimitSlot } from "@/lib/rate-limit";
import { resolveUserApiKey } from "@/lib/sunoapi/resolve-key";
import { logServerError } from "@/lib/error-logger";
import { invalidateByPrefix } from "@/lib/cache";
import { SUNOAPI_KEY } from "@/lib/env";
import { broadcast } from "@/lib/event-bus";

/** Map API errors to user-friendly messages without exposing internals */
function userFriendlyError(error: unknown): string {
  if (error instanceof SunoApiError) {
    if (error.status === 429) return "The music generation service is busy. Please try again in a few minutes.";
    if (error.status === 400) return "Invalid generation parameters. Please adjust your prompt and try again.";
    if (error.status === 401 || error.status === 403) return "API authentication failed. Please check your API key in settings.";
    if (error.status >= 500) return "The music generation service is temporarily unavailable. Please try again later.";
    return `Generation failed (Suno ${error.status}): ${error.message}`;
  }
  if (error instanceof TypeError && (error.message.includes("fetch") || error.message.includes("network"))) {
    return "Could not reach the music generation service. Please check your connection and try again.";
  }
  return "Song generation failed. Please try again.";
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const { id } = await params;

    const song = await prisma.song.findUnique({ where: { id } });
    if (!song || song.userId !== userId) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    if (song.generationStatus !== "failed") {
      return NextResponse.json(
        { error: "Only failed songs can be retried", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const { acquired, status: rateLimitStatus } = await acquireRateLimitSlot(userId);
    if (!acquired) {
      const retryAfterSec = Math.max(
        1,
        Math.ceil((new Date(rateLimitStatus.resetAt).getTime() - Date.now()) / 1000)
      );
      return NextResponse.json(
        {
          error: `Rate limit exceeded. You can generate up to ${rateLimitStatus.limit} songs per hour.`, code: "RATE_LIMIT",
          resetAt: rateLimitStatus.resetAt,
          rateLimit: rateLimitStatus,
        },
        {
          status: 429,
          headers: { "Retry-After": String(retryAfterSec) },
        }
      );
    }

    const userApiKey = await resolveUserApiKey(userId);
    const hasApiKey = !!(userApiKey || SUNOAPI_KEY);

    if (!hasApiKey) {
      // Demo mode — just reset to ready with mock data
      const updated = await prisma.song.update({
        where: { id },
        data: {
          generationStatus: "ready",
          errorMessage: null,
          pollCount: 0,
        },
      });
      broadcast(userId, {
        type: "generation_update",
        data: { songId: id, status: "ready" },
      });
      return NextResponse.json({ song: updated, rateLimit: rateLimitStatus }, { status: 200 });
    }

    try {
      const result = await generateSong(
        song.prompt || "",
        {
          title: song.title || undefined,
          style: song.tags || undefined,
          instrumental: song.isInstrumental,
        },
        userApiKey
      );

      const updated = await prisma.song.update({
        where: { id },
        data: {
          sunoJobId: result.taskId,
          generationStatus: "pending",
          errorMessage: null,
          pollCount: 0,
        },
      });

      invalidateByPrefix(`dashboard-stats:${userId}`);
      broadcast(userId, {
        type: "generation_update",
        data: { songId: id, status: "pending" },
      });

      return NextResponse.json({ song: updated, rateLimit: rateLimitStatus }, { status: 200 });
    } catch (apiError) {
      logServerError("retry-api", apiError, {
        userId,
        route: `/api/songs/${id}/retry`,
        params: { songId: id },
      });

      const errorMsg = userFriendlyError(apiError);
      const updated = await prisma.song.update({
        where: { id },
        data: {
          errorMessage: errorMsg,
        },
      });

      return NextResponse.json(
        { song: updated, error: errorMsg, rateLimit: rateLimitStatus },
        { status: 200 }
      );
    }
  } catch (error) {
    logServerError("retry-route", error, { route: "/api/songs/retry" });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
