import { NextResponse } from "next/server";
import { z } from "zod";
import { authRoute, resultResponse } from "@/lib/route-handler";
import { prisma } from "@/lib/prisma";
import { rateLimitCheck } from "@/lib/rate-limit";
import { prepareSongDownload } from "@/lib/songs";
import type { DownloadFormat } from "@/lib/songs";

const DOWNLOAD_RATE_LIMIT = 50;
const downloadQuerySchema = z.object({
  format: z.enum(["native", "mp3", "wav", "flac"]).default("native"),
  metadata: z.enum(["true", "false"]).default("true"),
});

export const GET = authRoute<
  { id: string },
  undefined,
  z.infer<typeof downloadQuerySchema>
>(
  async (_request, { auth, params, query }) => {
    const [song, user] = await Promise.all([
      prisma.song.findFirst({ where: { id: params.id, userId: auth.userId } }),
      prisma.user.findUnique({ where: { id: auth.userId }, select: { name: true } }),
    ]);

    if (!song) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const rl = await rateLimitCheck(auth.userId, "download", DOWNLOAD_RATE_LIMIT);
    if (!rl.ok) return rl.response;
    const status = rl.status;

    const requestedFormat = query.format as DownloadFormat | "native";
    const embedMetadata = query.metadata !== "false";

    const result = await prepareSongDownload({
      song,
      artistName: user?.name ?? "SunoFlow User",
      requestedFormat,
      embedMetadata,
    });

    if (!result.ok) return resultResponse(result);

    const headers = new Headers();
    headers.set("Content-Type", result.contentType);
    headers.set("Content-Disposition", `attachment; filename="${result.filename}"`);
    headers.set("Content-Length", String(result.buffer.byteLength));
    headers.set("X-RateLimit-Limit", DOWNLOAD_RATE_LIMIT.toString());
    headers.set("X-RateLimit-Remaining", status.remaining.toString());
    headers.set("X-RateLimit-Reset", status.resetAt);

    return new NextResponse(result.buffer, { status: 200, headers });
  },
  {
    route: "/api/songs/[id]/download",
    query: downloadQuerySchema,
  },
);
