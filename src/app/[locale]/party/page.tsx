import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { JamSessionsView } from "@/components/JamSessionsView";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Jam Sessions",
  description: "Host live party sessions — guests push song prompts via QR.",
  robots: { index: false },
};

export default async function PartyIndexPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  return (
    <AppShell>
      <JamSessionsView />
    </AppShell>
  );
}
