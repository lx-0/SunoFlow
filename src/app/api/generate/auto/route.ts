import { NextResponse } from "next/server";
import { z } from "zod";
import * as Sentry from "@sentry/nextjs";
import { authRoute } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { acquireRateLimitSlot } from "@/lib/rate-limit";
import { logServerError } from "@/lib/error-logger";
import { logger } from "@/lib/logger";
import {
  generateAutoSongDetails,
  MAX_REFERENCE_SONGS,
} from "@/lib/generate-auto";

const generateAutoBodySchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, "A description prompt is required")
    .max(1000, "Prompt must be 1000 characters or less"),
});

export const POST = authRoute(async (_request, { auth, body }) => {
  try {
    if (!auth.isAdmin) {
      const { acquired, status: rateLimitStatus } = await acquireRateLimitSlot(
        auth.userId,
        "lyrics_generate"
      );
      if (!acquired) {
        const resetAt = new Date(rateLimitStatus.resetAt);
        const retryAfterSec = Math.ceil((resetAt.getTime() - Date.now()) / 1000);
        logger.warn({ userId: auth.userId, action: "lyrics_generate", limit: rateLimitStatus.limit, resetAt: rateLimitStatus.resetAt }, "rate-limit: lyrics_generate limit exceeded");
        Sentry.addBreadcrumb({
          category: "rate-limit",
          message: "Lyrics generate rate limit exceeded",
          level: "warning",
          data: { userId: auth.userId, action: "lyrics_generate", limit: rateLimitStatus.limit, resetAt: rateLimitStatus.resetAt },
        });
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again later.", code: "RATE_LIMIT", resetAt: rateLimitStatus.resetAt },
          { status: 429, headers: { "Retry-After": String(Math.max(1, retryAfterSec)) } }
        );
      }
    }

    const favoriteSongs = await prisma.song.findMany({
      where: {
        userId: auth.userId,
        favorites: { some: { userId: auth.userId } },
      },
      orderBy: [{ rating: "desc" }, { downloadCount: "desc" }],
      take: MAX_REFERENCE_SONGS,
      select: { title: true, tags: true },
    });

    const result = await generateAutoSongDetails(body.prompt, favoriteSongs);

    if (!result) {
      return NextResponse.json(
        { error: "Generation failed. Please try again.", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      title: result.title ?? "",
      style: result.style ?? "",
      lyricsPrompt: result.lyricsPrompt ?? "",
    });
  } catch (error) {
    logServerError("generate-auto", error, { route: "/api/generate/auto", userId: auth.userId });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}, { body: generateAutoBodySchema, route: "/api/generate/auto" });
