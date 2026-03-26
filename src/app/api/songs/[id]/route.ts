import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import { logServerError } from "@/lib/error-logger";
import { computeETag, CacheControl, invalidateKey, cacheKey } from "@/lib/cache";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error: authError } = await resolveUser(request);

    if (authError) return authError;

    const { id } = await params;

    const song = await prisma.song.findFirst({
      where: { id, userId: userId },
      include: {
        songTags: { include: { tag: true }, orderBy: { tag: { name: "asc" } } },
        favorites: { where: { userId: userId }, select: { id: true } },
        _count: { select: { favorites: true } },
      },
    });

    if (!song) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const { favorites, _count, ...rest } = song;
    const data = {
      ...rest,
      isFavorite: favorites.length > 0,
      favoriteCount: _count.favorites,
    };

    const etag = computeETag(data);

    // Conditional request — return 304 if data hasn't changed
    const ifNoneMatch = request.headers.get("if-none-match");
    if (ifNoneMatch === etag) {
      return new NextResponse(null, {
        status: 304,
        headers: {
          ETag: etag,
          "Cache-Control": CacheControl.privateShort,
        },
      });
    }

    return NextResponse.json({ song: data }, {
      headers: {
        ETag: etag,
        "Cache-Control": CacheControl.privateShort,
      },
    });
  } catch (error) {
    logServerError("song-detail", error, { route: "/api/songs/[id]" });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId, error: authError } = await resolveUser(request);
    if (authError) return authError;

    const { id } = await params;
    const body = await request.json();
    const { visibility } = body as { visibility?: string };

    if (visibility !== undefined && visibility !== "public" && visibility !== "private") {
      return NextResponse.json(
        { error: "visibility must be 'public' or 'private'", code: "VALIDATION_ERROR" },
        { status: 400 }
      );
    }

    const song = await prisma.song.findFirst({ where: { id, userId } });
    if (!song) {
      return NextResponse.json({ error: "Not found", code: "NOT_FOUND" }, { status: 404 });
    }

    const updateData: Record<string, unknown> = {};

    if (visibility !== undefined) {
      const isPublic = visibility === "public";
      updateData.isPublic = isPublic;
      if (isPublic && !song.publicSlug) {
        updateData.publicSlug = randomBytes(6).toString("hex");
      }
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ error: "No valid fields to update", code: "VALIDATION_ERROR" }, { status: 400 });
    }

    const updated = await prisma.song.update({ where: { id }, data: updateData });

    // Invalidate public song cache if slug exists
    if (updated.publicSlug) {
      invalidateKey(cacheKey("public-song", updated.publicSlug));
    }

    return NextResponse.json({
      visibility: updated.isPublic ? "public" : "private",
      isPublic: updated.isPublic,
      publicSlug: updated.publicSlug,
    });
  } catch (error) {
    logServerError("song-patch", error, { route: "/api/songs/[id] PATCH" });
    return NextResponse.json(
      { error: "Internal server error", code: "INTERNAL_ERROR" },
      { status: 500 }
    );
  }
}
