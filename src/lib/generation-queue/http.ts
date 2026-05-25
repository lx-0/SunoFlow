import { NextResponse } from "next/server";
import { internalError, rateLimited } from "@/lib/api-error";
import type { ProcessNextResult } from "./types";

export function processNextResultToResponse(result: ProcessNextResult): Response {
  switch (result.outcome) {
    case "already_processing":
      return NextResponse.json({ message: "Already processing", item: result.item });

    case "empty":
      return NextResponse.json({ message: "Queue empty", item: null });

    case "rate_limited":
      return rateLimited(`Rate limit exceeded. Resets at ${result.rateLimit.resetAt}`, {
        rateLimit: result.rateLimit,
      });

    case "denied":
      return internalError();

    case "queued":
      return NextResponse.json({ queued: true, message: result.message }, { status: 503 });

    case "failed":
      return NextResponse.json(
        {
          item: { ...result.queueItem, status: "failed", songId: result.song.id, errorMessage: result.error },
          song: result.song,
          error: result.error,
          code: result.code,
          ...(result.details && { details: result.details }),
          ...(result.creditBalance !== undefined && { creditBalance: result.creditBalance }),
          correlationId: result.correlationId,
        },
        { status: 201 },
      );

    case "created":
      return NextResponse.json(
        {
          item: { ...result.queueItem, status: result.queueStatus, songId: result.song.id },
          song: result.song,
        },
        { status: 201 },
      );
  }
}
