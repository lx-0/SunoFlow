import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/AppShell";
import { PartyHostView } from "@/components/PartyHostView";
import { getJamSession } from "@/lib/jam";
import { auth } from "@/lib/auth";

export const metadata: Metadata = {
  title: "Jam Session",
  description: "Host console for a live SunoFlow jam session.",
  robots: { index: false },
};

export default async function PartyHostPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const result = await getJamSession(id, session.user.id);
  if (!result.ok) notFound();

  return (
    <AppShell>
      <PartyHostView session={result.data.session} />
    </AppShell>
  );
}
