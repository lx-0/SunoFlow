import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { generateSong } from "@/lib/sunoapi";
import { mockSongs } from "@/lib/sunoapi/mock";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userId = session.user.id;

    const { prompt, title, tags, makeInstrumental } = await request.json();

    if (!prompt || typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json(
        { error: "A style/genre prompt is required" },
        { status: 400 }
      );
    }

    let sunoSongs;
    let usedMock = false;
    try {
      sunoSongs = await generateSong(prompt.trim(), {
        title: title?.trim() || undefined,
        tags: tags?.trim() || undefined,
        makeInstrumental: Boolean(makeInstrumental),
      });
    } catch {
      // Fall back to mock when SUNOAPI_KEY is not configured
      sunoSongs = mockSongs.slice(0, 1);
      usedMock = true;
    }

    // Persist each returned song to the DB
    const savedSongs = await Promise.all(
      sunoSongs.map((s) =>
        prisma.song.create({
          data: {
            userId,
            sunoJobId: usedMock ? null : s.id,
            title: s.title || title?.trim() || null,
            prompt: prompt.trim(),
            tags: s.tags || tags?.trim() || null,
            audioUrl: s.audioUrl || null,
            imageUrl: s.imageUrl || null,
            duration: s.duration ?? null,
            lyrics: s.lyrics || null,
            sunoModel: s.model || null,
            generationStatus:
              usedMock || s.status === "complete"
                ? "ready"
                : s.status === "error"
                  ? "failed"
                  : "pending",
          },
        })
      )
    );

    return NextResponse.json({ songs: savedSongs }, { status: 201 });
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
