import type { Metadata } from "next";
import { AppShell } from "@/components/AppShell";
import { PlayHistoryView } from "@/components/PlayHistoryView";

export const metadata: Metadata = {
  title: "Recently Played",
  description: "Quick access to your last 50 played tracks.",
  robots: { index: false },
};

export default function HistoryPage() {
  return (
    <AppShell>
      <PlayHistoryView />
    </AppShell>
  );
}
