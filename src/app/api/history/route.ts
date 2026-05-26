import { z } from "zod";
import { NextResponse } from "next/server";
import { authDataRoute, authRoute } from "@/lib/route-handler";
import { notFound } from "@/lib/api-error";
import { zLimitParam, zCursorParam, zTrimmedParam } from "@/lib/query-params";
import { listPlayHistory, recordPlay, clearHistory } from "@/lib/history";
import { recordHistoryRequestSchema } from "@/lib/history/request";

const historyQuery = z.object({
  limit: zLimitParam(20, 50),
  cursor: zCursorParam,
  dateFrom: zTrimmedParam,
  dateTo: zTrimmedParam,
});

export const GET = authDataRoute(async (_request, { auth, query }) => {
  return await listPlayHistory(auth.userId, query);
}, { route: "/api/history", query: historyQuery });

export const POST = authRoute(
  async (_request, { auth, body }) => {
    const { songId } = body;
    const result = await recordPlay(auth.userId, songId);

    switch (result.status) {
      case "not_found":
        return notFound("Song not found");
      case "deduped":
        return NextResponse.json({ skipped: true }, { status: 200 });
      case "recorded":
        return NextResponse.json({ entry: result.entry }, { status: 201 });
    }
  },
  { route: "/api/history", body: recordHistoryRequestSchema },
);

export const DELETE = authRoute(
  async (_request, { auth }) => {
    await clearHistory(auth.userId);
    return NextResponse.json({ success: true });
  },
  { route: "/api/history" },
);
