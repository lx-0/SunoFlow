import { Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { PlaylistInviteView } from "@/components/PlaylistInviteView";

export default async function PlaylistInvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  return (
    <AppShell>
      <Suspense fallback={<div className="flex items-center justify-center p-12"><span className="text-gray-500">Loading invite…</span></div>}>
        <PlaylistInviteView token={token} />
      </Suspense>
    </AppShell>
  );
}
