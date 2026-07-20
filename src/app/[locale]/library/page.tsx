import type { Metadata } from "next";
import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionTabs } from "@/components/SectionTabs";
import { LibraryView } from "@/components/LibraryView";
import { LibrarySkeleton } from "@/components/Skeleton";
import { auth } from "@/lib/auth";
import { listLibrarySongs } from "@/lib/songs";

export const metadata: Metadata = {
  title: "Your Library",
  description: "Browse and manage all your AI-generated songs in one place.",
  robots: { index: false },
};

async function fetchSongs() {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    return listLibrarySongs(session.user.id);
  } catch {
    return [];
  }
}

export default async function LibraryPage() {
  const songs = await fetchSongs();

  return (
    <AppShell>
      <SectionTabs group="myMusic" />
      <Suspense fallback={<LibrarySkeleton />}>
        <LibraryView initialSongs={songs} />
      </Suspense>
    </AppShell>
  );
}
