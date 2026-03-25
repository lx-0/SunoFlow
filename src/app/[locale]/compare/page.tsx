import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SongCompareView, type CompareSong } from "@/components/SongCompareView";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Compare Songs",
  description: "Compare two song variations side by side with synced playback.",
  robots: { index: false },
};

async function fetchSong(id: string, userId: string): Promise<CompareSong | null> {
  try {
    const song = await prisma.song.findFirst({
      where: { id, userId },
      select: {
        id: true,
        title: true,
        tags: true,
        prompt: true,
        lyrics: true,
        audioUrl: true,
        imageUrl: true,
        duration: true,
        generationStatus: true,
        isInstrumental: true,
        createdAt: true,
        sunoModel: true,
      },
    });
    if (!song) return null;
    return {
      id: song.id,
      title: song.title,
      tags: song.tags,
      prompt: song.prompt,
      lyrics: song.lyrics,
      audioUrl: song.audioUrl,
      imageUrl: song.imageUrl,
      duration: song.duration,
      generationStatus: song.generationStatus ?? "unknown",
      isInstrumental: song.isInstrumental,
      createdAt: song.createdAt.toISOString(),
      model: song.sunoModel,
    };
  } catch {
    return null;
  }
}

export default async function ComparePage({
  searchParams,
}: {
  searchParams: { a?: string; b?: string };
}) {
  const { a, b } = searchParams;

  if (!a || !b) notFound();

  const session = await auth();
  if (!session?.user?.id) notFound();

  const [songA, songB] = await Promise.all([
    fetchSong(a, session.user.id),
    fetchSong(b, session.user.id),
  ]);

  if (!songA || !songB) notFound();

  return <SongCompareView songA={songA} songB={songB} />;
}
