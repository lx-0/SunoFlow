import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/prisma";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      isDisabled: true,
      onboardingCompleted: true,
      createdAt: true,
      lastLoginAt: true,
      _count: {
        select: { songs: true, playlists: true, favorites: true },
      },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    ...user,
    songCount: user._count.songs,
    playlistCount: user._count.playlists,
    favoriteCount: user._count.favorites,
  });
}
