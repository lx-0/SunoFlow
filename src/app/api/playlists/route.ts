import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const MAX_PLAYLISTS = 50;

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const playlists = await prisma.playlist.findMany({
      where: { userId: session.user.id },
      include: { _count: { select: { songs: true } } },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ playlists });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    if (name.trim().length > 100) {
      return NextResponse.json(
        { error: "Name must be 100 characters or less" },
        { status: 400 }
      );
    }

    const count = await prisma.playlist.count({
      where: { userId: session.user.id },
    });

    if (count >= MAX_PLAYLISTS) {
      return NextResponse.json(
        { error: `Maximum of ${MAX_PLAYLISTS} playlists reached` },
        { status: 400 }
      );
    }

    const playlist = await prisma.playlist.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId: session.user.id,
      },
      include: { _count: { select: { songs: true } } },
    });

    return NextResponse.json({ playlist }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
