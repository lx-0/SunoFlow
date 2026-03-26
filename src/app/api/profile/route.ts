import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { resolveUser } from "@/lib/auth-resolver";
import { prisma } from "@/lib/prisma";
import { stripHtml } from "@/lib/sanitize";

export async function GET(request: Request) {
  const { userId, error: authError } = await resolveUser(request);

  if (authError) return authError;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, name: true, bio: true, avatarUrl: true, username: true, bannerUrl: true, featuredSongId: true, defaultStyle: true, preferredGenres: true },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json(user);
}

export async function PATCH(request: Request) {
  const { userId, error: authError } = await resolveUser(request);

  if (authError) return authError;

  const body = await request.json();
  const { name, bio, avatarUrl, username, bannerUrl, featuredSongId } = body;

  const data: Record<string, unknown> = {};

  if (name !== undefined) {
    if (typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Name is required", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (name.length > 100) {
      return NextResponse.json({ error: "Name must be 100 characters or less", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    data.name = stripHtml(name).trim();
  }

  if (bio !== undefined) {
    if (bio !== null && typeof bio !== "string") {
      return NextResponse.json({ error: "Bio must be a string", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (typeof bio === "string" && bio.length > 500) {
      return NextResponse.json({ error: "Bio must be 500 characters or less", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    data.bio = bio ? stripHtml(bio).trim() : null;
  }

  if (avatarUrl !== undefined) {
    if (avatarUrl !== null && typeof avatarUrl !== "string") {
      return NextResponse.json({ error: "Avatar URL must be a string", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (typeof avatarUrl === "string" && avatarUrl.length > 2048) {
      return NextResponse.json({ error: "Avatar URL too long", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (typeof avatarUrl === "string" && avatarUrl) {
      try {
        new URL(avatarUrl);
      } catch {
        return NextResponse.json({ error: "Invalid avatar URL", code: "VALIDATION_ERROR" }, { status: 400 });
      }
    }
    data.avatarUrl = avatarUrl ? avatarUrl.trim() : null;
  }

  if (username !== undefined) {
    if (username !== null && typeof username !== "string") {
      return NextResponse.json({ error: "Username must be a string", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (typeof username === "string") {
      const trimmed = username.trim().toLowerCase();
      if (trimmed.length > 30) {
        return NextResponse.json({ error: "Username must be 30 characters or less", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      if (trimmed && !/^[a-z0-9_]+$/.test(trimmed)) {
        return NextResponse.json({ error: "Username may only contain letters, numbers, and underscores", code: "VALIDATION_ERROR" }, { status: 400 });
      }
      if (trimmed) {
        const existing = await prisma.user.findUnique({
          where: { username: trimmed },
          select: { id: true },
        });
        if (existing && existing.id !== userId) {
          return NextResponse.json({ error: "Username is already taken", code: "CONFLICT" }, { status: 409 });
        }
        data.username = trimmed;
      } else {
        data.username = null;
      }
    } else {
      data.username = null;
    }
  }

  if (bannerUrl !== undefined) {
    if (bannerUrl !== null && typeof bannerUrl !== "string") {
      return NextResponse.json({ error: "Banner URL must be a string", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (typeof bannerUrl === "string" && bannerUrl.length > 2048) {
      return NextResponse.json({ error: "Banner URL too long", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (typeof bannerUrl === "string" && bannerUrl) {
      try {
        new URL(bannerUrl);
      } catch {
        return NextResponse.json({ error: "Invalid banner URL", code: "VALIDATION_ERROR" }, { status: 400 });
      }
    }
    data.bannerUrl = bannerUrl ? bannerUrl.trim() : null;
  }

  if (featuredSongId !== undefined) {
    if (featuredSongId !== null && typeof featuredSongId !== "string") {
      return NextResponse.json({ error: "Featured song ID must be a string", code: "VALIDATION_ERROR" }, { status: 400 });
    }
    if (featuredSongId) {
      const song = await prisma.song.findFirst({
        where: { id: featuredSongId, userId },
        select: { id: true },
      });
      if (!song) {
        return NextResponse.json({ error: "Song not found", code: "NOT_FOUND" }, { status: 404 });
      }
    }
    data.featuredSongId = featuredSongId ?? null;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "No fields to update", code: "VALIDATION_ERROR" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
    select: { id: true, email: true, name: true, bio: true, avatarUrl: true, username: true, bannerUrl: true, featuredSongId: true },
  });

  return NextResponse.json(user);
}

export async function DELETE(request: Request) {
  const { userId, error: authError } = await resolveUser(request);

  if (authError) return authError;

  const { password, confirmEmail } = await request.json();

  if (!password || !confirmEmail) {
    return NextResponse.json(
      { error: "Password and email confirmation are required", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true },
  });

  if (!user?.passwordHash) {
    return NextResponse.json({ error: "User not found", code: "NOT_FOUND" }, { status: 404 });
  }

  if (confirmEmail !== user.email) {
    return NextResponse.json(
      { error: "Email does not match your account", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    return NextResponse.json(
      { error: "Password is incorrect", code: "VALIDATION_ERROR" },
      { status: 400 }
    );
  }

  // Cascade delete: songs, playlists, templates, accounts, sessions all cascade
  await prisma.user.delete({ where: { id: userId } });

  return NextResponse.json({ success: true });
}
