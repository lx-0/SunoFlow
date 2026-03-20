import { notFound } from "next/navigation";
import { SessionProvider } from "@/components/SessionProvider";
import { AppShell } from "@/components/AppShell";
import { SongDetailView } from "@/components/SongDetailView";
import { sunoApi } from "@/lib/sunoapi";
import { mockSongs } from "@/lib/sunoapi/mock";

async function fetchSong(id: string) {
  try {
    return await sunoApi.getSongById(id);
  } catch {
    // Fall back to mock data when SUNOAPI_KEY is not configured
    return mockSongs.find((s) => s.id === id) ?? null;
  }
}

export default async function SongDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const song = await fetchSong(params.id);

  if (!song) {
    notFound();
  }

  return (
    <SessionProvider>
      <AppShell>
        <SongDetailView song={song} />
      </AppShell>
    </SessionProvider>
  );
}
