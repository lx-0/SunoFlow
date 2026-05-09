import { NextResponse } from "next/server";
import { logServerError } from "@/lib/error-logger";
import { authRoute } from "@/lib/route-handler";
import { executeMashup, type TrackSource } from "@/lib/mashup";

export const POST = authRoute(async (request, { auth }) => {
  const body = await request.json();
  const { trackA, trackB, title, prompt, style, instrumental } = body as {
    trackA: TrackSource;
    trackB: TrackSource;
    title?: string;
    prompt?: string;
    style?: string;
    instrumental?: boolean;
  };

  if (!trackA || !trackB) {
    return NextResponse.json(
      { error: "Two tracks are required for a mashup", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const outcome = await executeMashup({
    userId: auth.userId,
    trackA,
    trackB,
    title,
    prompt,
    style,
    instrumental,
  });

  if (outcome.status === "denied") return outcome.response as NextResponse;

  if (outcome.status === "queued") {
    return NextResponse.json(
      { queued: true, message: outcome.message },
      { status: 503 },
    );
  }

  if (outcome.status === "failed") {
    logServerError("mashup-api", outcome.rawError, {
      userId: auth.userId,
      route: "/api/mashup",
    });
    return NextResponse.json(
      { songs: [outcome.song], error: outcome.error, rateLimit: outcome.rateLimitStatus },
      { status: 201 },
    );
  }

  return NextResponse.json(
    { songs: [outcome.song], rateLimit: outcome.rateLimitStatus },
    { status: 201 },
  );
}, { route: "/api/mashup" });
