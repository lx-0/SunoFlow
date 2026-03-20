import { notFound } from "next/navigation";
import { SessionProvider } from "@/components/SessionProvider";
import { AppShell } from "@/components/AppShell";
import { SongDetailView } from "@/components/SongDetailView";
import { sunoApi } from "@/lib/sunoapi";
import { mockSongs } from "@/lib/sunoapi/mock";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function fetchSong(id: string) {
  try {
    return await sunoApi.getSongById(id);
  } catch {
    // Fall back to mock data when SUNOAPI_KEY is not configured
    return mockSongs.find((s) => s.id === id) ?? null;
  }
}

async function fetchFavoriteState(songId: string): Promise<boolean> {
  try {
    const session = await auth();
    if (!session?.user?.id) return false;
    const dbSong = await prisma.song.findFirst({
      where: { id: songId, userId: session.user.id },
      select: { isFavorite: true },
    });
    return dbSong?.isFavorite ?? false;
  } catch {
    return false;
  }
}

export default async function SongDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const [song, isFavorite] = await Promise.all([
    fetchSong(params.id),
    fetchFavoriteState(params.id),
  ]);

  if (!song) {
    notFound();
  }

  return (
    <SessionProvider>
      <AppShell>
        <SongDetailView song={song} isFavorite={isFavorite} />
      </AppShell>
    </SessionProvider>
  );
}
