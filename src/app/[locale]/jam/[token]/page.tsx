import type { Metadata } from "next";
import { JamGuestView } from "@/components/JamGuestView";

export const metadata: Metadata = {
  title: "Jam Session",
  description: "Request a song at this SunoFlow jam session.",
  robots: { index: false },
};

/**
 * Public guest surface — the share token in the URL is the only auth, so this
 * page renders WITHOUT AppShell/session. All data flows through the tokened
 * /api/jam/[token] endpoints.
 */
export default async function JamGuestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return <JamGuestView token={token} />;
}
