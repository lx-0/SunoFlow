import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { invalidateKey, cacheKey } from "@/lib/cache";

export async function PATCH(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const song = await prisma.song.findFirst({
      where: { id: params.id, userId: session.user.id },
    });

    if (!song) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const newIsPublic = !song.isPublic;
    const publicSlug = newIsPublic
      ? song.publicSlug ?? randomBytes(6).toString("hex")
      : song.publicSlug; // keep slug even when toggling off

    const updated = await prisma.song.update({
      where: { id: song.id },
      data: { isPublic: newIsPublic, publicSlug },
    });

    // Invalidate cached public song page if slug exists
    if (updated.publicSlug) {
      invalidateKey(cacheKey("public-song", updated.publicSlug));
    }

    return NextResponse.json({
      isPublic: updated.isPublic,
      publicSlug: updated.publicSlug,
    });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
