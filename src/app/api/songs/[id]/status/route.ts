import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSongById } from "@/lib/sunoapi";
import { resolveUserApiKey } from "@/lib/sunoapi/resolve-key";

const MAX_POLL_ATTEMPTS = 20;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const song = await prisma.song.findUnique({ where: { id } });
    if (!song || song.userId !== session.user.id) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // Already terminal — return as-is
    if (song.generationStatus === "ready" || song.generationStatus === "failed") {
      return NextResponse.json({ song });
    }

    // No sunoJobId to poll — treat as failed after max attempts
    if (!song.sunoJobId) {
      const updated = await prisma.song.update({
        where: { id },
        data: { generationStatus: "failed", errorMessage: "No Suno job ID" },
      });
      return NextResponse.json({ song: updated });
    }

    const newPollCount = song.pollCount + 1;

    // Exceeded max attempts without completing — mark failed
    if (newPollCount > MAX_POLL_ATTEMPTS) {
      const updated = await prisma.song.update({
        where: { id },
        data: {
          generationStatus: "failed",
          pollCount: newPollCount,
          errorMessage: "Generation timed out",
        },
      });
      return NextResponse.json({ song: updated });
    }

    // Check status with Suno API
    const userApiKey = await resolveUserApiKey(session.user.id);
    let sunoSong;
    try {
      sunoSong = await getSongById(song.sunoJobId, userApiKey);
    } catch {
      // Transient error — increment poll count but don't fail yet
      const updated = await prisma.song.update({
        where: { id },
        data: { pollCount: newPollCount },
      });
      return NextResponse.json({ song: updated });
    }

    if (sunoSong.status === "complete") {
      const updated = await prisma.song.update({
        where: { id },
        data: {
          generationStatus: "ready",
          audioUrl: sunoSong.audioUrl || song.audioUrl,
          imageUrl: sunoSong.imageUrl || song.imageUrl,
          duration: sunoSong.duration ?? song.duration,
          lyrics: sunoSong.lyrics || song.lyrics,
          title: sunoSong.title || song.title,
          pollCount: newPollCount,
        },
      });
      return NextResponse.json({ song: updated });
    }

    if (sunoSong.status === "error") {
      const updated = await prisma.song.update({
        where: { id },
        data: {
          generationStatus: "failed",
          pollCount: newPollCount,
          errorMessage: "Suno generation failed",
        },
      });
      return NextResponse.json({ song: updated });
    }

    // Still pending/streaming — update poll count
    const updated = await prisma.song.update({
      where: { id },
      data: { pollCount: newPollCount },
    });
    return NextResponse.json({ song: updated });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
