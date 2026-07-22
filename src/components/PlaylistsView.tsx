"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "@/i18n/navigation";
import {
  Plus,
  Music,
  Trash2,
  ListMusic,
  Sparkles,
  Flame,
  CalendarDays,
  Smile,
  Archive,
  PartyPopper,
} from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "./Toast";
import { track } from "@/lib/analytics";
import { InAppFeedbackWidget, hasFeedbackBeenSubmitted } from "./InAppFeedbackWidget";
import { createPlaylist, deletePlaylist, type LibraryPlaylist } from "@/lib/songs/library-client";

interface PlaylistItem {
  id: string;
  name: string;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { songs: number };
}

interface SmartPlaylistItem extends PlaylistItem {
  smartPlaylistType: string | null;
  smartRefreshedAt: string | null;
}

function SmartPlaylistIcon({ type }: { type: string | null }) {
  switch (type) {
    case "top_hits":
      return <Icon icon={Flame} className="w-6 h-6 text-orange-400" />;
    case "new_this_week":
      return <Icon icon={CalendarDays} className="w-6 h-6 text-blue-400" />;
    case "mood":
      return <Icon icon={Smile} className="w-6 h-6 text-yellow-400" />;
    case "archive":
      return <Icon icon={Archive} className="w-6 h-6 text-secondary" />;
    default:
      return <Icon icon={Sparkles} className="w-6 h-6 text-violet-400" />;
  }
}

function SmartPlaylistBadge({ type }: { type: string | null }) {
  const label =
    type === "top_hits"
      ? "Top Hits"
      : type === "new_this_week"
      ? "New This Week"
      : type === "mood"
      ? "Mood"
      : type === "archive"
      ? "Archive"
      : "Smart";

  // The archive tile is not "smart/auto-generated" in the celebratory sense —
  // give it a neutral badge so it reads as a system shelf, not a suggestion.
  if (type === "archive") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-surface-hover text-secondary">
        <Icon icon={Archive} className="w-3 h-3" aria-hidden="true" />
        {label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300">
      <Icon icon={Sparkles} className="w-3 h-3" aria-hidden="true" />
      {label}
    </span>
  );
}

export function PlaylistsView({
  playlists: initialPlaylists,
  smartPlaylists = [],
}: {
  playlists: LibraryPlaylist[];
  smartPlaylists?: SmartPlaylistItem[];
}) {
  const { toast } = useToast();
  const { data: authSession } = useSession();
  const router = useRouter();
  const [playlists, setPlaylists] = useState(initialPlaylists);
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const isStudio = authSession?.user?.subscriptionTier === "studio";
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [feedbackPlaylistId, setFeedbackPlaylistId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim() || creating) return;

    setCreating(true);
    try {
      const result = await createPlaylist({
        name: newName.trim(),
        description: newDesc.trim() || undefined,
      });
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }

      setPlaylists((prev) => [result.playlist, ...prev]);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      track("playlist_created");
      toast("Playlist created", "success");
      if (!hasFeedbackBeenSubmitted("playlist_creation", result.playlist.id)) {
        setFeedbackPlaylistId(result.playlist.id);
      }
    } catch {
      toast("Failed to create playlist", "error");
    } finally {
      setCreating(false);
    }
  }


  async function handleDelete(id: string) {
    setConfirmDeleteId(null);
    setDeletingId(id);
    try {
      const result = await deletePlaylist(id);
      if (!result.ok) {
        toast(result.error, "error");
        return;
      }
      setPlaylists((prev) => prev.filter((p) => p.id !== id));
      toast("Playlist deleted", "success");
    } catch {
      toast("Failed to delete playlist", "error");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="px-4 py-4 space-y-4" data-tour="explore">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">
            Playlists
          </h1>
          <span className="text-secondary text-sm">
            {playlists.length} playlist{playlists.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {isStudio && (
            <button
              onClick={() => router.push("/party")}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-surface-raised border border-violet-500/40 text-violet-400 hover:bg-surface-hover transition-colors min-h-[44px]"
            >
              <Icon icon={PartyPopper} className="w-4 h-4" />
              Jam
            </button>
          )}
          <button
            onClick={() => setShowCreate((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors min-h-[44px]"
          >
            <Icon icon={Plus} className="w-4 h-4" />
            New
          </button>
        </div>
      </div>


      {/* Create form */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-surface border border-border rounded-xl p-4 space-y-3"
        >
          <input
            type="text"
            placeholder="Playlist name"
            aria-label="Playlist name"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            maxLength={100}
            autoFocus
            className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <input
            type="text"
            placeholder="Description (optional)"
            aria-label="Playlist description"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            className="w-full bg-surface-raised border border-border rounded-xl px-4 py-3 text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!newName.trim() || creating}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {creating ? "Creating…" : "Create"}
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-surface-raised hover:bg-surface-hover text-primary transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Smart playlists section */}
      {smartPlaylists.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Icon icon={Sparkles} className="w-4 h-4" aria-hidden="true" />
            Auto-Generated
          </h2>
          <ul className="space-y-2">
            {smartPlaylists.map((pl) => (
              <li
                key={pl.id}
                className="bg-surface-raised border border-violet-200 dark:border-violet-900/50 rounded-xl overflow-hidden transition-colors hover:border-violet-400 dark:hover:border-violet-600"
              >
                <Link
                  href={
                    pl.smartPlaylistType === "archive"
                      ? "/library?smartFilter=archived"
                      : `/playlists/${pl.id}`
                  }
                  className="flex items-center gap-3 px-4 py-3"
                >
                  {/* Icon */}
                  <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                    <SmartPlaylistIcon type={pl.smartPlaylistType} />
                  </div>

                  {/* Name + meta */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-primary truncate hover:text-violet-400 transition-colors">
                        {pl.name}
                      </p>
                      <SmartPlaylistBadge type={pl.smartPlaylistType} />
                    </div>
                    {pl.description && (
                      <p className="text-xs text-secondary truncate mt-0.5">
                        {pl.description}
                      </p>
                    )}
                    <p className="text-xs text-muted mt-0.5">
                      {pl._count.songs} song{pl._count.songs !== 1 ? "s" : ""}
                    </p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* User-created playlists section */}
      {smartPlaylists.length > 0 && (
        <h2 className="text-sm font-semibold text-secondary uppercase tracking-wider flex items-center gap-1.5">
          <Icon icon={ListMusic} className="w-4 h-4" aria-hidden="true" />
          Your Playlists
        </h2>
      )}

      {playlists.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-8 text-center">
          <Icon icon={ListMusic} className="w-10 h-10 mx-auto text-muted mb-3" aria-hidden="true" />
          <h3 className="text-base font-semibold text-primary mb-1">No playlists yet</h3>
          <p className="text-secondary text-sm mb-4">
            Create a playlist to organize your songs by mood, project, or anything you like.
          </p>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            <Icon icon={Plus} className="w-4 h-4" aria-hidden="true" />
            Create your first playlist
          </button>
        </div>
      ) : (
        <ul className="space-y-2">
          {playlists.map((pl) => (
            <li
              key={pl.id}
              className="bg-surface-raised border border-border rounded-xl overflow-hidden transition-colors hover:border-violet-400 dark:hover:border-violet-600"
            >
              <div className="flex items-center gap-3 px-4 py-3">
                {/* Icon */}
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <Icon icon={Music} className="w-6 h-6 text-violet-500" />
                </div>

                {/* Name + meta */}
                <Link
                  href={`/playlists/${pl.id}`}
                  className="flex-1 min-w-0"
                >
                  <p className="text-sm font-medium text-primary truncate hover:text-violet-400 transition-colors">
                    {pl.name}
                  </p>
                  {pl.description && (
                    <p className="text-xs text-secondary truncate mt-0.5">
                      {pl.description}
                    </p>
                  )}
                  <p className="text-xs text-muted mt-0.5">
                    {pl._count.songs} song{pl._count.songs !== 1 ? "s" : ""}
                  </p>
                </Link>

                {/* Delete button with confirmation */}
                {confirmDeleteId === pl.id ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleDelete(pl.id)}
                      disabled={deletingId === pl.id}
                      aria-label={`Confirm delete ${pl.name}`}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50"
                    >
                      {deletingId === pl.id ? "…" : "Delete"}
                    </button>
                    <button
                      onClick={() => setConfirmDeleteId(null)}
                      aria-label="Cancel delete"
                      className="px-2.5 py-1.5 rounded-lg text-xs font-medium bg-surface-raised text-secondary transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setConfirmDeleteId(pl.id)}
                    disabled={deletingId === pl.id}
                    aria-label="Delete playlist"
                    className="flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-muted hover:text-red-500 transition-colors disabled:opacity-50"
                  >
                    <Icon icon={Trash2} className="w-5 h-5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {feedbackPlaylistId && (
        <InAppFeedbackWidget
          source="playlist_creation"
          entityId={feedbackPlaylistId}
          onClose={() => setFeedbackPlaylistId(null)}
        />
      )}
    </div>
  );
}
