import { NextRequest, NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";

/**
 * Audio proxy — streams audio from the Suno origin through this endpoint.
 *
 * Cache-Control: private — browser may cache, but CDN/shared caches must not.
 * This endpoint requires authentication and enforces per-user ownership; a
 * public CDN cache would allow any requester knowing the song ID to bypass
 * auth and retrieve another user's audio.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ songId: string }> }
) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const { songId } = await params;

    const song = await prisma.song.findFirst({
      where: { id: songId, userId },
      select: { audioUrl: true },
    });

    if (!song?.audioUrl) {
      return NextResponse.json(
        { error: "Not found", code: "NOT_FOUND" },
        { status: 404 }
      );
    }

    // Forward Range header so browsers can seek within the audio stream
    const upstreamHeaders: Record<string, string> = {};
    const rangeHeader = request.headers.get("range");
    if (rangeHeader) {
      upstreamHeaders["Range"] = rangeHeader;
    }

    let upstream: Response;
    try {
      upstream = await fetch(song.audioUrl, { headers: upstreamHeaders });
    } catch {
      return NextResponse.json(
        { error: "Failed to fetch audio from origin", code: "UPSTREAM_ERROR" },
        { status: 502 }
      );
    }

    // Accept both 200 and 206 (partial content for range requests)
    if (!upstream.ok && upstream.status !== 206) {
      return NextResponse.json(
        { error: "Audio unavailable at origin", code: "UPSTREAM_ERROR" },
        { status: 502 }
      );
    }

    const responseHeaders = new Headers();

    // Preserve content-type from upstream (audio/mpeg, audio/wav, etc.)
    const contentType = upstream.headers.get("content-type") ?? "audio/mpeg";
    responseHeaders.set("Content-Type", contentType);

    // Forward streaming/range headers so browsers can seek properly
    const contentLength = upstream.headers.get("content-length");
    if (contentLength) responseHeaders.set("Content-Length", contentLength);
    const contentRange = upstream.headers.get("content-range");
    if (contentRange) responseHeaders.set("Content-Range", contentRange);
    const acceptRanges = upstream.headers.get("accept-ranges");
    responseHeaders.set("Accept-Ranges", acceptRanges ?? "bytes");

    // Private cache only — CDN must not cache authenticated user content
    responseHeaders.set("Cache-Control", "private, max-age=3600");

    return new Response(upstream.body, {
      status: upstream.status,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
