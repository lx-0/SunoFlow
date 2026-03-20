import { SessionProvider } from "@/components/SessionProvider";
import { AppShell } from "@/components/AppShell";
import { LibraryView } from "@/components/LibraryView";
import { sunoApi } from "@/lib/sunoapi";
import { mockSongs } from "@/lib/sunoapi/mock";

async function fetchSongs() {
  try {
    const songs = await sunoApi.listSongs();
    return songs;
  } catch {
    // Fall back to mock data when SUNOAPI_KEY is not configured
    return mockSongs;
  }
}

export default async function LibraryPage() {
  const songs = await fetchSongs();

  return (
    <SessionProvider>
      <AppShell>
        <LibraryView songs={songs} />
      </AppShell>
    </SessionProvider>
  );
}
