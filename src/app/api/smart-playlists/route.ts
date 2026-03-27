import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import { ensureDefaultSmartPlaylists } from "@/lib/smart-playlists";
import { logServerError } from "@/lib/error-logger";
import { CacheControl } from "@/lib/cache";

/**
 * GET /api/smart-playlists
 *
 * Returns all smart playlists for the authenticated user.
 * Auto-creates the default set (Top Hits, New This Week, Mood: Chill) on first call.
 */
export async function GET(request: Request) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    // Ensure defaults exist (no-op if already created)
    await ensureDefaultSmartPlaylists(userId);

    const playlists = await prisma.playlist.findMany({
      where: { userId, isSmartPlaylist: true },
      include: { _count: { select: { songs: true } } },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ playlists }, {
      headers: { "Cache-Control": CacheControl.privateShort },
    });
  } catch (error) {
    logServerError("smart-playlists", error, { route: "/api/smart-playlists" });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
