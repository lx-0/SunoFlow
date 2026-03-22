import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { HistoryView } from "@/components/HistoryView";
import { HistorySkeleton } from "@/components/Skeleton";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Song } from "@prisma/client";

async function fetchHistory(): Promise<Song[]> {
  try {
    const session = await auth();
    if (!session?.user?.id) return [];
    return await prisma.song.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    });
  } catch {
    return [];
  }
}

async function HistoryContent() {
  const songs = await fetchHistory();
  return <HistoryView songs={songs} />;
}

export default function HistoryPage() {
  return (
    <AppShell>
      <Suspense fallback={<HistorySkeleton />}>
        <HistoryContent />
      </Suspense>
    </AppShell>
  );
}
