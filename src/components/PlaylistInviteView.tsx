"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Music, UsersRound } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "./Toast";
import { apiGet, apiPost } from "@/lib/api-client";
import { HttpError } from "@/components/QueryProvider";

interface InviteInfo {
  id: string;
  status: string;
  expiresAt: string;
  playlist: {
    id: string;
    name: string;
    description: string | null;
    _count: { songs: number };
    user: { name: string | null };
  };
}

export function PlaylistInviteView({ token }: { token: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [invite, setInvite] = useState<InviteInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    async function fetchInvite() {
      try {
        const data = await apiGet<{ invite: InviteInfo }>(`/api/playlists/invite/${token}`);
        setInvite(data.invite);
      } catch (e) {
        setError(e instanceof HttpError ? `Error ${e.status}` : "Failed to load invite");
      } finally {
        setLoading(false);
      }
    }
    fetchInvite();
  }, [token]);

  async function handleAccept() {
    if (accepting) return;
    setAccepting(true);
    try {
      const data = await apiPost<{ playlistId: string }>(`/api/playlists/invite/${token}`, {});
      toast("You joined the playlist!", "success");
      router.push(`/playlists/${data.playlistId}`);
    } catch {
      toast("Failed to accept invite", "error");
    } finally {
      setAccepting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <span className="text-gray-500">Loading invite…</span>
      </div>
    );
  }

  if (error || !invite) {
    return (
      <div className="px-4 py-12 max-w-md mx-auto text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
          <Icon icon={Music} className="w-8 h-8 text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-primary">Invite unavailable</h1>
        <p className="text-secondary text-sm">
          {error ?? "This invite link is invalid or has expired."}
        </p>
        <button
          onClick={() => router.push("/playlists")}
          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
        >
          Go to playlists
        </button>
      </div>
    );
  }

  return (
    <div className="px-4 py-12 max-w-md mx-auto space-y-6">
      <div className="text-center space-y-3">
        <div className="w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mx-auto">
          <Icon icon={UsersRound} className="w-8 h-8 text-violet-500" />
        </div>
        <h1 className="text-xl font-bold text-primary">
          You&apos;ve been invited to collaborate
        </h1>
        <p className="text-sm text-secondary">
          {invite.playlist.user.name ?? "Someone"} invited you to add songs to their playlist.
        </p>
      </div>

      <div className="bg-surface-raised border border-border rounded-xl p-4 space-y-2">
        <h2 className="font-semibold text-primary">{invite.playlist.name}</h2>
        {invite.playlist.description && (
          <p className="text-sm text-secondary">{invite.playlist.description}</p>
        )}
        <p className="text-xs text-muted">
          {invite.playlist._count.songs} song{invite.playlist._count.songs !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="space-y-2">
        <button
          onClick={handleAccept}
          disabled={accepting}
          className="w-full px-5 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {accepting ? "Joining…" : "Join as collaborator"}
        </button>
        <button
          onClick={() => router.push("/playlists")}
          className="w-full px-5 py-3 bg-surface-raised hover:bg-surface-hover text-gray-700 dark:text-gray-300 text-sm font-medium rounded-xl transition-colors"
        >
          Decline
        </button>
      </div>

      <p className="text-xs text-muted text-center">
        Expires {new Date(invite.expiresAt).toLocaleDateString()}
      </p>
    </div>
  );
}
