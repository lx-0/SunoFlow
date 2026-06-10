import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute } from "@/lib/route-handler";
import { generateLyrics } from "@/lib/lyrics";

const bodySchema = z.object({
  // Up to a full link-followed article (≈5000 chars) plus framing can be the
  // generation basis — the LLM in generateLyrics has no such limit.
  prompt: z.string().min(1, "A lyrics prompt is required").max(6000, "Prompt must be 6000 characters or less"),
});

export const POST = authRoute(
  async (_request, { auth, body }) => {
    const result = await generateLyrics(auth.userId, body.prompt);

    if (!result.ok) {
      if (result.code === "RATE_LIMITED") {
        return NextResponse.json(
          {
            error: "Rate limit exceeded. Please try again later.",
            code: "RATE_LIMIT",
            resetAt: result.resetAt,
          },
          {
            status: 429,
            headers: { "Retry-After": String(result.retryAfterSec) },
          }
        );
      }
      return NextResponse.json(
        { error: "Lyrics generation failed. Please try again.", code: "INTERNAL_ERROR" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      lyrics: result.lyrics,
      referenceSongs: result.referenceSongs,
    });
  },
  { route: "/api/lyrics/generate", body: bodySchema }
);
