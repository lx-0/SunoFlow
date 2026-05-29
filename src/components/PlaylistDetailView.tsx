"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MusicalNoteIcon,
  TrashIcon,
  ArrowLeftIcon,
  PencilIcon,
  ShareIcon,
  GlobeAltIcon,
  UserGroupIcon,
  MegaphoneIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon as PlaySolidIcon } from "@heroicons/react/24/solid";
import { useToast } from "./Toast";
import { useQueue, type QueueSong } from "./QueueContext";
import { SwipeablePlaylistItem } from "./SwipeablePlaylistItem";
import { BottomSheet } from "./BottomSheet";
import { songToQueueSong } from "@/lib/song-mappers";
import { formatDuration as formatTime } from "@/lib/time-format";
import type { PlaylistData, PlaylistSongItem, PlaylistCollaboratorItem, PlaylistActivityItem } from "./playlist-detail/types";
import { PlaylistSongListItem } from "./playlist-detail/PlaylistSongListItem";
import { PlaylistSharePanel } from "./playlist-detail/PlaylistSharePanel";
import { PlaylistCollaboratorsPanel } from "./playlist-detail/PlaylistCollaboratorsPanel";
import { PlaylistActivityFeed } from "./playlist-detail/PlaylistActivityFeed";
import { PlaylistBatchToolbar } from "./playlist-detail/PlaylistBatchToolbar";
import { usePlaylistReorder } from "./playlist-detail/usePlaylistReorder";
import { usePlaylistEditing } from "./playlist-detail/usePlaylistEditing";
import { usePlaylistSharing } from "./playlist-detail/usePlaylistSharing";
import { usePlaylistCollaboration } from "./playlist-detail/usePlaylistCollaboration";
import { usePlaylistPublishing } from "./playlist-detail/usePlaylistPublishing";
import { usePlaylistActivityFeed } from "./playlist-detail/usePlaylistActivityFeed";
import { usePlaylistBatchActions } from "./playlist-detail/usePlaylistBatchActions";

export type { PlaylistData, PlaylistSongItem, PlaylistCollaboratorItem, PlaylistActivityItem };

export function PlaylistDetailView({
  playlist: initialPlaylist,
  isOwner = true,
}: {
  playlist: PlaylistData;
  isOwner?: boolean;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const {
    queue,
    currentIndex,
    isPlaying,
    togglePlay,
    playQueue,
    playNext,
    addToQueue,
  } = useQueue();

  const currentSongId = currentIndex >= 0 ? queue[currentIndex]?.id ?? null : null;

  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [songs, setSongs] = useState(initialPlaylist.songs);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const editing_ = usePlaylistEditing({
    playlistId: playlist.id,
    initialName: initialPlaylist.name,
    initialDescription: initialPlaylist.description,
    toast,
    onSaved: (updates) => setPlaylist((prev) => ({ ...prev, ...updates })),
  });

  const sharing = usePlaylistSharing({
    playlistId: playlist.id,
    initialIsPublic: initialPlaylist.isPublic,
    initialSlug: initialPlaylist.slug,
    toast,
  });

  const collab = usePlaylistCollaboration({
    playlistId: playlist.id,
    initialIsCollaborative: initialPlaylist.isCollaborative,
    initialCollaborators: initialPlaylist.collaborators ?? [],
    toast,
  });

  const publishing = usePlaylistPublishing({
    playlistId: playlist.id,
    initialIsPublished: initialPlaylist.isPublished ?? false,
    initialGenre: initialPlaylist.genre ?? null,
    songCount: songs.length,
    toast,
    onPublished: (data) => {
      sharing.setIsPublic(data.isPublic);
      sharing.setSlug(data.slug);
    },
  });

  const activity = usePlaylistActivityFeed({ playlistId: playlist.id });

  const batch = usePlaylistBatchActions({
    playlistId: playlist.id,
    songs,
    setSongs,
    toast,
  });

  const handleReorderError = useCallback((msg: string) => toast(msg, "error"), [toast]);

  const {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleDragHandleTouchStart,
    handleKeyboardReorder,
  } = usePlaylistReorder({ playlistId: playlist.id, songs, setSongs, onError: handleReorderError });

  function buildPlaylistQueue(): QueueSong[] {
    return songs
      .map((ps) => songToQueueSong(ps.song))
      .filter((s): s is QueueSong => s !== null);
  }

  function handleTogglePlay(song: PlaylistSongItem["song"]) {
    const qs = songToQueueSong(song);
    if (!qs) return;
    if (currentSongId === song.id) {
      togglePlay(qs);
      return;
    }
    const queueSongs = buildPlaylistQueue();
    const idx = queueSongs.findIndex((s) => s.id === song.id);
    playQueue(queueSongs, idx >= 0 ? idx : 0, playlist.name);
  }

  function handlePlayAll() {
    const queueSongs = buildPlaylistQueue();
    if (queueSongs.length > 0) {
      playQueue(queueSongs, 0, playlist.name);
    }
  }

  const handleRemoveSong = useCallback(
    async (songId: string) => {
      setSongs((prev) => prev.filter((ps) => ps.songId !== songId));
      try {
        const res = await fetch(
          `/api/playlists/${playlist.id}/songs/${songId}`,
          { method: "DELETE" }
        );
        if (!res.ok) {
          setSongs(songs);
          toast("Failed to remove song", "error");
          return;
        }
        toast("Song removed", "success");
      } catch {
        setSongs(songs);
        toast("Failed to remove song", "error");
      }
    },
    [playlist.id, songs, toast]
  );

  async function handleDelete() {
    setShowDeleteConfirm(false);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, { method: "DELETE" });
      if (!res.ok) {
        toast("Failed to delete playlist", "error");
        return;
      }
      toast("Playlist deleted", "success");
      router.push("/playlists");
    } catch {
      toast("Failed to delete playlist", "error");
    }
  }

  const totalDuration = songs.reduce(
    (sum, ps) => sum + (ps.song.duration ?? 0),
    0
  );

  const filteredCollaborators = collab.collaborators.filter((c) => c.user);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Back link */}
      <Link
        href="/playlists"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-400 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Playlists
      </Link>

      {/* Header */}
      {editing_.editing ? (
        <form onSubmit={editing_.handleSaveEdit} className="space-y-3">
          <input
            type="text"
            aria-label="Playlist name"
            value={editing_.editName}
            onChange={(e) => editing_.setEditName(e.target.value)}
            maxLength={100}
            autoFocus
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <input
            type="text"
            aria-label="Playlist description"
            value={editing_.editDesc}
            onChange={(e) => editing_.setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!editing_.editName.trim() || editing_.saving}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {editing_.saving ? "Saving..." : "Save"}
            </button>
            <button
              type="button"
              onClick={() => editing_.cancelEdit(playlist.name, playlist.description)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              {playlist.name}
            </h1>
            {playlist.description && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">
                {playlist.description}
              </p>
            )}
            <div className="flex items-center gap-2 mt-0.5">
              <p className="text-sm text-gray-400 dark:text-gray-500">
                {songs.length} song{songs.length !== 1 ? "s" : ""}
                {totalDuration > 0 && ` · ${formatTime(totalDuration)}`}
              </p>
              {publishing.isPublished && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400">
                  <GlobeAltIcon className="w-3 h-3" />
                  Published
                </span>
              )}
            </div>
            {songs.length > 0 && (
              <button
                onClick={batch.handleSelectAll}
                className="mt-1 text-xs font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors"
              >
                {batch.selectedSongIds.size === songs.length ? "Deselect all" : "Select all"}
              </button>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isOwner && (
              <button
                onClick={() => {
                  if (publishing.isPublished) {
                    publishing.setShowUnpublishConfirm(true);
                  } else {
                    publishing.openPublishDialog();
                  }
                }}
                aria-label={publishing.isPublished ? "Unpublish from Discover" : "Publish to Discover"}
                title={publishing.isPublished ? "Unpublish from Discover" : "Publish to Discover"}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  publishing.isPublished
                    ? "text-green-500 dark:text-green-400 hover:text-green-600"
                    : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
                }`}
              >
                <MegaphoneIcon className="w-5 h-5" />
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => { collab.setShowCollabPanel((v) => !v); sharing.setShowSharePanel(false); }}
                aria-label="Collaborative mode"
                aria-expanded={collab.showCollabPanel}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  collab.isCollaborative
                    ? "text-violet-500 dark:text-violet-400 hover:text-violet-600"
                    : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
                }`}
              >
                <UserGroupIcon className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => { sharing.setShowSharePanel((v) => !v); collab.setShowCollabPanel(false); }}
              aria-label="Share playlist"
              aria-expanded={sharing.showSharePanel}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                sharing.isPublic
                  ? "text-violet-500 dark:text-violet-400 hover:text-violet-600"
                  : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
              }`}
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            {isOwner && (
              <>
                <button
                  onClick={() => editing_.setEditing(true)}
                  aria-label="Edit playlist"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  aria-label="Delete playlist"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Collaborator avatars */}
      {collab.isCollaborative && filteredCollaborators.length > 0 && !editing_.editing && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Collaborators:</span>
          <div className="flex -space-x-2">
            {filteredCollaborators.slice(0, 5).map((c) => (
              <div
                key={c.id}
                title={c.user?.name ?? "Collaborator"}
                className="w-7 h-7 rounded-full bg-violet-200 dark:bg-violet-800 border-2 border-white dark:border-gray-900 overflow-hidden flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300 flex-shrink-0"
              >
                {(c.user?.avatarUrl ?? c.user?.image) ? (
                  <Image
                    src={(c.user?.avatarUrl ?? c.user?.image)!}
                    alt={c.user?.name ?? "Collaborator"}
                    width={28}
                    height={28}
                    className="object-cover w-full h-full"
                  />
                ) : (
                  (c.user?.name?.[0] ?? "?").toUpperCase()
                )}
              </div>
            ))}
            {filteredCollaborators.length > 5 && (
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                +{filteredCollaborators.length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collaborative panel (owner only) */}
      {collab.showCollabPanel && isOwner && !editing_.editing && (
        <PlaylistCollaboratorsPanel
          playlistId={playlist.id}
          isCollaborative={collab.isCollaborative}
          isTogglingCollab={collab.isTogglingCollab}
          collaborators={collab.collaborators}
          onToggleCollaborative={collab.handleToggleCollaborative}
          onRemoveCollaborator={collab.handleRemoveCollaborator}
          onInviteByUsername={collab.handleInviteByUsername}
          onGenerateInvite={collab.handleGenerateInvite}
          isGeneratingInvite={collab.isGeneratingInvite}
          inviteLink={collab.inviteLink}
          onCopyInviteLink={collab.handleCopyInviteLink}
        />
      )}

      {/* Share panel */}
      {sharing.showSharePanel && !editing_.editing && (
        <PlaylistSharePanel
          isPublic={sharing.isPublic}
          slug={sharing.slug}
          isTogglingShare={sharing.isTogglingShare}
          onToggleShare={sharing.handleToggleShare}
          onCopyLink={sharing.handleCopyLink}
          onCopyEmbed={sharing.handleCopyEmbed}
        />
      )}

      {/* Play all button */}
      {songs.length > 0 && !editing_.editing && (
        <button
          onClick={handlePlayAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors min-h-[44px]"
        >
          <PlaySolidIcon className="w-4 h-4" />
          Play All
        </button>
      )}

      {/* Delete confirmation */}
      <BottomSheet
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete playlist"
      >
        <div className="space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            Delete &ldquo;{playlist.name}&rdquo;? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors min-h-[44px]"
            >
              Delete
            </button>
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Publish confirmation */}
      <BottomSheet
        open={publishing.showPublishConfirm}
        onClose={() => publishing.setShowPublishConfirm(false)}
        title="Publish to Discover"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This will make your playlist visible on the Discover page{!sharing.isPublic ? " and set it to public" : ""}.
          </p>
          {songs.length === 0 && (
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">
              Your playlist needs at least 1 song before it can be published.
            </p>
          )}
          <div className="space-y-1.5">
            <label htmlFor="publish-genre" className="text-xs font-medium text-gray-500 dark:text-gray-400">
              Genre (optional)
            </label>
            <select
              id="publish-genre"
              value={publishing.selectedGenre}
              onChange={(e) => publishing.setSelectedGenre(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">No genre</option>
              {publishing.genres.map((g) => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={publishing.handlePublish}
              disabled={publishing.isPublishing || songs.length === 0}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {publishing.isPublishing ? "Publishing..." : "Publish"}
            </button>
            <button
              onClick={() => publishing.setShowPublishConfirm(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Unpublish confirmation */}
      <BottomSheet
        open={publishing.showUnpublishConfirm}
        onClose={() => publishing.setShowUnpublishConfirm(false)}
        title="Unpublish playlist"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This will remove your playlist from the Discover page. The public share link will still work.
          </p>
          <div className="flex gap-2">
            <button
              onClick={publishing.handleUnpublish}
              disabled={publishing.isPublishing}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {publishing.isPublishing ? "Unpublishing..." : "Unpublish"}
            </button>
            <button
              onClick={() => publishing.setShowUnpublishConfirm(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Song list */}
      {songs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <MusicalNoteIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700 mb-3" aria-hidden="true" />
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-1">No songs yet</h3>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Add songs to this playlist from your library.
          </p>
          <Link
            href="/library"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-xl transition-colors"
          >
            Browse your library
          </Link>
        </div>
      ) : (
        <ul className={`space-y-1 ${batch.selectionMode ? "pb-20" : ""}`}>
          {songs.map((ps, index) => {
            const isActive = currentSongId === ps.songId;
            const hasAudio = Boolean(ps.song.audioUrl);
            const isDragOver = dragOverIndex === index;
            const isSelected = batch.selectedSongIds.has(ps.songId);

            return (
              <SwipeablePlaylistItem
                key={ps.id}
                onSwipeRemove={batch.selectionMode ? () => {} : () => handleRemoveSong(ps.songId)}
              >
                <PlaylistSongListItem
                  ps={ps}
                  index={index}
                  isActive={isActive}
                  hasAudio={hasAudio}
                  isDragOver={isDragOver}
                  dragIndex={dragIndex}
                  isSelected={isSelected}
                  selectionMode={batch.selectionMode}
                  isPlaying={isPlaying}
                  isCollaborative={collab.isCollaborative}
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e: React.DragEvent) => handleDragOver(e, index)}
                  onDrop={(e: React.DragEvent) => handleDrop(e, index)}
                  onDragEnd={handleDragEnd}
                  onDragHandleTouchStart={() => handleDragHandleTouchStart(index)}
                  onKeyboardReorder={(dir) => handleKeyboardReorder(index, dir)}
                  isFirst={index === 0}
                  isLast={index === songs.length - 1}
                  onTogglePlay={() => handleTogglePlay(ps.song)}
                  onPlayNext={() => { const qs = songToQueueSong(ps.song); if (qs) playNext(qs); }}
                  onAddToQueue={() => { const qs = songToQueueSong(ps.song); if (qs) addToQueue(qs); }}
                  onRemove={() => handleRemoveSong(ps.songId)}
                  onToggleSelect={() => batch.handleToggleSelect(ps.songId)}
                  onLongPress={() => batch.setSelectedSongIds(new Set([ps.songId]))}
                />
              </SwipeablePlaylistItem>
            );
          })}
        </ul>
      )}

      {/* Batch toolbar */}
      {batch.selectionMode && (
        <PlaylistBatchToolbar
          selectedCount={batch.selectedSongIds.size}
          batchDownloading={batch.batchDownloading}
          batchDownloadProgress={batch.batchDownloadProgress}
          batchLoading={batch.batchLoading}
          onDownload={batch.handleBatchDownload}
          onRemove={() => batch.setShowBatchDeleteConfirm(true)}
          onClearSelection={() => batch.setSelectedSongIds(new Set())}
        />
      )}

      {/* Activity feed — collaborative playlists only */}
      {collab.isCollaborative && (
        <PlaylistActivityFeed
          activities={activity.activities}
          activityLoading={activity.activityLoading}
          showActivityFeed={activity.showActivityFeed}
          onToggle={activity.handleToggleActivityFeed}
        />
      )}

      {/* Batch delete confirmation */}
      {batch.showBatchDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="batch-remove-dialog-title"
          onKeyDown={(e) => { if (e.key === "Escape") batch.setShowBatchDeleteConfirm(false); }}
        >
          <div className="bg-white dark:bg-gray-900 w-full sm:rounded-2xl rounded-t-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-6 sm:mx-4 sm:max-w-sm">
            <h3 id="batch-remove-dialog-title" className="text-lg font-semibold text-gray-900 dark:text-white">
              Remove {batch.selectedSongIds.size} song{batch.selectedSongIds.size !== 1 ? "s" : ""} from playlist?
            </h3>
            <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
              The songs will remain in your library.
            </p>
            <div className="mt-4 flex gap-3 justify-end">
              <button
                onClick={() => batch.setShowBatchDeleteConfirm(false)}
                disabled={batch.batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white hover:bg-gray-300 dark:hover:bg-gray-700 transition-colors min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={batch.handleBatchRemoveFromPlaylist}
                disabled={batch.batchLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
              >
                {batch.batchLoading ? "Removing..." : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
