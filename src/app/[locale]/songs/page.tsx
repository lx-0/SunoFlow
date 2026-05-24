import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { SongsGalleryView } from "@/components/SongsGalleryView";
import { SongsGallerySkeleton } from "@/components/Skeleton";
import { auth } from "@/lib/auth";
import { listReadySongs } from "@/lib/songs";

export const metadata: Metadata = {
  title: "Songs Gallery",
  description: "View and manage your AI-generated songs in a visual gallery.",
  robots: { index: false },
};

async function fetchSongs() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    return listReadySongs(session.user.id);
  } catch {
    return [];
  }
}

export default async function SongsPage() {
  const songs = await fetchSongs();

  return (
    <AppShell>
      <Suspense fallback={<SongsGallerySkeleton />}>
        <SongsGalleryView initialSongs={songs} />
      </Suspense>
    </AppShell>
  );
}
