import { NextResponse } from "next/server";
import { authRoute, resultResponse } from "@/lib/route-handler";
import { recordPlay } from "@/lib/analytics-data";
import { recordPlayRequestSchema } from "@/lib/analytics-data/request";

export const POST = authRoute(async (_request, { auth, body }) => {
  const { songId, durationSec } = body;
  const result = await recordPlay(auth.userId, songId, durationSec);

  if (!result.ok) return resultResponse(result);

  const status = result.data.eventId ? 201 : 200;
  return NextResponse.json(result.data, { status });
}, { route: "/api/analytics/play", body: recordPlayRequestSchema });
