"use client";

import { useState, useCallback, useRef } from "react";
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
import { PlayIcon as PlaySolidIcon, CheckIcon } from "@heroicons/react/24/solid";
import type { Song } from "@prisma/client";
import { useToast } from "./Toast";
import { useQueue, type QueueSong } from "./QueueContext";
import { SwipeablePlaylistItem } from "./SwipeablePlaylistItem";
import { BottomSheet } from "./BottomSheet";
import { songToQueueSong } from "@/lib/song-mappers";
import { formatDuration as formatTime } from "@/lib/time-format";
import { usePlaylistReorder } from "@/hooks/usePlaylistReorder";
import { usePlaylistCollaboration } from "@/hooks/usePlaylistCollaboration";
import { usePlaylistBatchOps, type PlaylistSongItem } from "@/hooks/usePlaylistBatchOps";
import { usePlaylistShare } from "@/hooks/usePlaylistShare";
import { usePlaylistPublish } from "@/hooks/usePlaylistPublish";
import { usePlaylistActivity } from "@/hooks/usePlaylistActivity";
import { usePlaylistEditing } from "@/hooks/usePlaylistEditing";

interface CollaboratorUser {
  id: string;
  name: string | null;
  image: string | null;
  avatarUrl: string | null;
  username?: string | null;
}

interface PlaylistCollaboratorItem {
  id: string;
  userId: string | null;
  status: string;
  role?: string;
  user: CollaboratorUser | null;
}

interface PlaylistData {
  id: string;
  name: string;
  description: string | null;
  isPublic: boolean;
  isPublished?: boolean;
  publishedAt?: string | null;
  genre?: string | null;
  isCollaborative: boolean;
  slug: string | null;
  songs: PlaylistSongItem[];
  _count: { songs: number };
  collaborators: PlaylistCollaboratorItem[];
}

interface SongListItemProps {
  ps: PlaylistSongItem;
  index: number;
  isActive: boolean;
  hasAudio: boolean;
  isDragOver: boolean;
  dragIndex: number | null;
  isSelected: boolean;
  selectionMode: boolean;
  isPlaying: boolean;
  isCollaborative: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragHandleTouchStart: () => void;
  onKeyboardReorder: (direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onRemove: () => void;
  onToggleSelect: () => void;
  onLongPress: () => void;
}

function SongListItem({
  ps, index, isActive, hasAudio, isDragOver, dragIndex, isSelected, selectionMode, isPlaying, isCollaborative,
  onDragStart, onDragOver, onDrop, onDragEnd, onDragHandleTouchStart, onKeyboardReorder, isFirst, isLast,
  onTogglePlay, onPlayNext, onAddToQueue, onRemove, onToggleSelect, onLongPress,
}: SongListItemProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-drag-handle]")) return;
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    longPressTimer.current = setTimeout(() => { onLongPress(); }, 500);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - touchStartPos.current.x) > 10 || Math.abs(t.clientY - touchStartPos.current.y) > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }
  function handleTouchEnd() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    touchStartPos.current = null;
  }

  return (
    <li
      data-drag-index={index}
      draggable={!selectionMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-colors ${
        isSelected
          ? "border border-violet-500 bg-violet-50 dark:bg-violet-950/30"
          : isActive
            ? "bg-violet-50 dark:bg-violet-900/20 border border-violet-300 dark:border-violet-700"
            : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
      } ${isDragOver && !selectionMode ? "border-violet-400 dark:border-violet-500" : ""} ${
        dragIndex === index ? "opacity-50" : ""
      }`}
    >
      {selectionMode ? (
        <button
          onClick={onToggleSelect}
          aria-label={isSelected ? "Deselect song" : "Select song"}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isSelected ? "bg-violet-600 border-violet-600 text-white" : "border-gray-300 dark:border-gray-600 hover:border-violet-400"
          }`}
        >
          {isSelected && <CheckIcon className="w-4 h-4" />}
        </button>
      ) : (
        <div
          data-drag-handle
          tabIndex={0}
          role="button"
          aria-label={`Reorder ${ps.song.title ?? "song"}. Press arrow keys to move up or down.`}
          aria-disabled={isFirst && isLast}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
          onTouchStart={onDragHandleTouchStart}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); onKeyboardReorder("up"); }
            else if (e.key === "ArrowDown") { e.preventDefault(); onKeyboardReorder("down"); }
          }}
        >
          <Bars3Icon className="w-5 h-5" />
        </div>
      )}

      <span className="flex-shrink-0 w-6 text-xs text-gray-400 dark:text-gray-500 text-center hidden sm:block">
        {index + 1}
      </span>

      <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
        {ps.song.imageUrl ? (
          <Image src={ps.song.imageUrl} alt={ps.song.title ?? "Song"} fill className="object-cover" sizes="40px" loading="lazy" />
        ) : (
          <MusicalNoteIcon className="w-5 h-5 text-gray-400 dark:text-gray-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/library/${ps.songId}`}
          className="block text-sm font-medium text-gray-900 dark:text-white truncate hover:text-violet-400 transition-colors"
        >
          {ps.song.title ?? "Untitled"}
        </Link>
        <div className="flex items-center gap-1.5">
          {ps.song.duration && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(ps.song.duration)}</span>
          )}
          {isCollaborative && ps.addedByUser?.name && (
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              · {ps.addedByUser.name}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onTogglePlay}
        disabled={!hasAudio}
        aria-label={isActive && isPlaying ? "Pause" : "Play"}
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
          hasAudio
            ? "bg-violet-600 hover:bg-violet-500 text-white"
            : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isActive && isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
      </button>

      {hasAudio && !selectionMode && (
        <div className="hidden sm:flex items-center gap-0.5">
          <button
            onClick={onPlayNext}
            aria-label={`Play ${ps.song.title ?? "song"} next`}
            title="Play Next"
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
          >
            <ForwardIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onAddToQueue}
            aria-label={`Add ${ps.song.title ?? "song"} to queue`}
            title="Add to Queue"
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
          >
            <QueueListIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {!selectionMode && (
        <button
          onClick={onRemove}
          aria-label="Remove from playlist"
          className="flex-shrink-0 w-11 h-11 rounded-full hidden sm:flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}

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

  // --- Extracted hooks ---
  const editing = usePlaylistEditing({
    playlistId: playlist.id,
    initialName: initialPlaylist.name,
    initialDescription: initialPlaylist.description || "",
    toast,
    onPlaylistUpdate: (data) => setPlaylist((prev) => ({ ...prev, ...((data as { playlist?: Partial<PlaylistData> }).playlist ?? {}) })),
    onDeleted: () => router.push("/playlists"),
  });

  const share = usePlaylistShare({
    playlistId: playlist.id,
    initialIsPublic: initialPlaylist.isPublic,
    initialSlug: initialPlaylist.slug,
    toast,
  });

  const collab = usePlaylistCollaboration({
    playlistId: initialPlaylist.id,
    initialIsCollaborative: initialPlaylist.isCollaborative,
    initialCollaborators: initialPlaylist.collaborators ?? [],
    toast,
  });

  const publish = usePlaylistPublish({
    playlistId: playlist.id,
    initialIsPublished: initialPlaylist.isPublished ?? false,
    initialGenre: initialPlaylist.genre ?? "",
    songCount: songs.length,
    toast,
    onPublicityChange: (isPublic, slug) => {
      share.setIsPublic(isPublic);
      share.setSlug(slug);
    },
  });

  const activity = usePlaylistActivity({ playlistId: playlist.id });

  const batch = usePlaylistBatchOps({
    playlistId: playlist.id,
    songs,
    setSongs,
    toast,
  });

  const reorder = usePlaylistReorder({ playlistId: playlist.id, songs, setSongs, toast });

  // --- Playback helpers ---
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

  const totalDuration = songs.reduce(
    (sum, ps) => sum + (ps.song.duration ?? 0),
    0
  );

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
      {editing.editing ? (
        <form onSubmit={editing.handleSaveEdit} className="space-y-3">
          <input
            type="text"
            aria-label="Playlist name"
            value={editing.editName}
            onChange={(e) => editing.setEditName(e.target.value)}
            maxLength={100}
            autoFocus
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <input
            type="text"
            aria-label="Playlist description"
            value={editing.editDesc}
            onChange={(e) => editing.setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!editing.editName.trim() || editing.saving}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {editing.saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={editing.cancelEdit}
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
              {publish.isPublished && (
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
                  if (publish.isPublished) {
                    publish.openUnpublish();
                  } else {
                    publish.openPublish();
                  }
                }}
                aria-label={publish.isPublished ? "Unpublish from Discover" : "Publish to Discover"}
                title={publish.isPublished ? "Unpublish from Discover" : "Publish to Discover"}
                className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                  publish.isPublished
                    ? "text-green-500 dark:text-green-400 hover:text-green-600"
                    : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
                }`}
              >
                <MegaphoneIcon className="w-5 h-5" />
              </button>
            )}
            {isOwner && (
              <button
                onClick={() => { collab.toggleCollabPanel(); share.setShowSharePanel(false); }}
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
              onClick={() => share.toggleSharePanel(collab.closeCollabPanel)}
              aria-label="Share playlist"
              aria-expanded={share.showSharePanel}
              className={`w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                share.isPublic
                  ? "text-violet-500 dark:text-violet-400 hover:text-violet-600"
                  : "text-gray-400 dark:text-gray-500 hover:text-violet-400"
              }`}
            >
              <ShareIcon className="w-5 h-5" />
            </button>
            {isOwner && (
              <>
                <button
                  onClick={editing.startEdit}
                  aria-label="Edit playlist"
                  className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
                >
                  <PencilIcon className="w-5 h-5" />
                </button>
                <button
                  onClick={() => editing.setShowDeleteConfirm(true)}
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
      {collab.isCollaborative && collab.collaborators.filter((c) => c.user).length > 0 && !editing.editing && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 dark:text-gray-400">Collaborators:</span>
          <div className="flex -space-x-2">
            {collab.collaborators.filter((c) => c.user).slice(0, 5).map((c) => (
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
            {collab.collaborators.filter((c) => c.user).length > 5 && (
              <div className="w-7 h-7 rounded-full bg-gray-200 dark:bg-gray-700 border-2 border-white dark:border-gray-900 flex items-center justify-center text-xs font-medium text-gray-600 dark:text-gray-300">
                +{collab.collaborators.filter((c) => c.user).length - 5}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Collaborative panel (owner only) */}
      {collab.showCollabPanel && isOwner && !editing.editing && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <UserGroupIcon className={`w-4 h-4 ${collab.isCollaborative ? "text-violet-500" : "text-gray-400 dark:text-gray-500"}`} />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {collab.isCollaborative ? "Collaborative mode on" : "Collaborative mode off"}
              </span>
            </div>
            <button
              onClick={collab.handleToggleCollaborative}
              disabled={collab.isTogglingCollab}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 ${
                collab.isCollaborative ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
              }`}
              role="switch"
              aria-checked={collab.isCollaborative}
              aria-label="Toggle collaborative mode"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  collab.isCollaborative ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {collab.isCollaborative && (
            <div className="space-y-3">
              <form onSubmit={collab.handleInviteByUsername} className="space-y-2">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Invite by username</p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    aria-label="Username to invite"
                    placeholder="@username"
                    value={collab.inviteUsername}
                    onChange={(e) => collab.setInviteUsername(e.target.value)}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  />
                  <select
                    aria-label="Collaborator role"
                    value={collab.inviteRole}
                    onChange={(e) => collab.setInviteRole(e.target.value as "editor" | "viewer")}
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-1 focus:ring-violet-500"
                  >
                    <option value="editor">Editor</option>
                    <option value="viewer">Viewer</option>
                  </select>
                  <button
                    type="submit"
                    disabled={!collab.inviteUsername.trim() || collab.isInvitingByUsername}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-white bg-violet-600 hover:bg-violet-500 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <UserPlusIcon className="w-3.5 h-3.5" />
                    {collab.isInvitingByUsername ? "Adding…" : "Add"}
                  </button>
                </div>
              </form>

              <div className="space-y-2">
                <button
                  onClick={collab.handleGenerateInvite}
                  disabled={collab.isGeneratingInvite}
                  className="flex items-center gap-2 text-sm font-medium text-violet-600 dark:text-violet-400 hover:text-violet-500 transition-colors disabled:opacity-50"
                >
                  <LinkIcon className="w-4 h-4" />
                  {collab.isGeneratingInvite ? "Generating…" : "Generate invite link"}
                </button>

                {collab.inviteLink && (
                  <div className="flex gap-2">
                    <input
                      readOnly
                      aria-label="Invite link"
                      value={collab.inviteLink}
                      className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                    />
                    <button
                      onClick={collab.handleCopyInviteLink}
                      className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
                    >
                      <LinkIcon className="w-3.5 h-3.5" />
                      Copy
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {collab.isCollaborative && collab.collaborators.filter((c) => c.user).length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Current collaborators</p>
              {collab.collaborators.filter((c) => c.user).map((c) => (
                <div key={c.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300 overflow-hidden flex-shrink-0">
                      {(c.user?.avatarUrl ?? c.user?.image) ? (
                        <Image
                          src={(c.user?.avatarUrl ?? c.user?.image)!}
                          alt={c.user?.name ?? ""}
                          width={28}
                          height={28}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        (c.user?.name?.[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div>
                      <span className="text-sm text-gray-900 dark:text-white">{c.user?.name ?? "Unknown"}</span>
                      <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded-full font-medium ${c.role === "viewer" ? "bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400" : "bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400"}`}>
                        {c.role ?? "editor"}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => collab.handleRemoveCollaborator(c.id)}
                    aria-label={`Remove ${c.user?.name ?? "collaborator"}`}
                    className="text-xs text-red-500 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Share panel */}
      {share.showSharePanel && !editing.editing && (
        <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {share.isPublic ? (
                <GlobeAltIcon className="w-4 h-4 text-violet-500" />
              ) : (
                <LockClosedIcon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
              )}
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {share.isPublic ? "Public playlist" : "Private playlist"}
              </span>
            </div>
            <button
              onClick={share.handleToggleShare}
              disabled={share.isTogglingShare}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 focus:ring-offset-white dark:focus:ring-offset-gray-900 disabled:opacity-50 ${
                share.isPublic ? "bg-violet-600" : "bg-gray-400 dark:bg-gray-600"
              }`}
              role="switch"
              aria-checked={share.isPublic}
              aria-label="Toggle playlist visibility"
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  share.isPublic ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {share.isPublic && share.slug && (
            <>
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Share link</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    aria-label="Share link"
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/p/${share.slug}`}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
                  />
                  <button
                    onClick={share.handleCopyLink}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
                  >
                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Embed code</p>
                <div className="flex gap-2">
                  <input
                    readOnly
                    aria-label="Embed code"
                    value={`<iframe src="${typeof window !== "undefined" ? window.location.origin : ""}/embed/playlist/${share.slug}" width="400" height="500" frameborder="0" allow="autoplay"></iframe>`}
                    className="flex-1 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
                  />
                  <button
                    onClick={share.handleCopyEmbed}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-lg hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors whitespace-nowrap"
                  >
                    <ClipboardDocumentIcon className="w-3.5 h-3.5" />
                    Copy
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Play all button */}
      {songs.length > 0 && !editing.editing && (
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
        open={editing.showDeleteConfirm}
        onClose={() => editing.setShowDeleteConfirm(false)}
        title="Delete playlist"
      >
        <div className="space-y-3">
          <p className="text-sm text-red-700 dark:text-red-300">
            Delete &ldquo;{playlist.name}&rdquo;? This cannot be undone.
          </p>
          <div className="flex gap-2">
            <button
              onClick={editing.handleDelete}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors min-h-[44px]"
            >
              Delete
            </button>
            <button
              onClick={() => editing.setShowDeleteConfirm(false)}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Publish confirmation */}
      <BottomSheet
        open={publish.showPublishConfirm}
        onClose={() => publish.setShowPublishConfirm(false)}
        title="Publish to Discover"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This will make your playlist visible on the Discover page{!share.isPublic ? " and set it to public" : ""}.
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
              value={publish.selectedGenre}
              onChange={(e) => publish.setSelectedGenre(e.target.value)}
              className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2.5 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            >
              <option value="">No genre</option>
              {publish.genres.map((g) => (
                <option key={g.name} value={g.name}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button
              onClick={publish.handlePublish}
              disabled={publish.isPublishing || songs.length === 0}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {publish.isPublishing ? "Publishing…" : "Publish"}
            </button>
            <button
              onClick={() => publish.setShowPublishConfirm(false)}
              className="px-4 py-2.5 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 transition-colors min-h-[44px]"
            >
              Cancel
            </button>
          </div>
        </div>
      </BottomSheet>

      {/* Unpublish confirmation */}
      <BottomSheet
        open={publish.showUnpublishConfirm}
        onClose={() => publish.setShowUnpublishConfirm(false)}
        title="Unpublish playlist"
      >
        <div className="space-y-3">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            This will remove your playlist from the Discover page. The public share link will still work.
          </p>
          <div className="flex gap-2">
            <button
              onClick={publish.handleUnpublish}
              disabled={publish.isPublishing}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {publish.isPublishing ? "Unpublishing…" : "Unpublish"}
            </button>
            <button
              onClick={() => publish.setShowUnpublishConfirm(false)}
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
            const isDragOver = reorder.dragOverIndex === index;
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
                  dragIndex={reorder.dragIndex}
                  isSelected={isSelected}
                  selectionMode={batch.selectionMode}
                  isPlaying={isPlaying}
                  isCollaborative={collab.isCollaborative}
                  onDragStart={() => reorder.handleDragStart(index)}
                  onDragOver={(e: React.DragEvent) => reorder.handleDragOver(e, index)}
                  onDrop={(e: React.DragEvent) => reorder.handleDrop(e, index)}
                  onDragEnd={reorder.handleDragEnd}
                  onDragHandleTouchStart={() => reorder.handleDragHandleTouchStart(index)}
                  onKeyboardReorder={(dir) => reorder.handleKeyboardReorder(index, dir)}
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
        <div className="fixed bottom-20 md:bottom-4 left-2 right-2 sm:left-1/2 sm:right-auto sm:-translate-x-1/2 z-40 flex items-center gap-2 px-4 py-3 bg-gray-900 dark:bg-gray-800 text-white rounded-2xl shadow-2xl border border-gray-700 animate-slide-in">
          <span className="text-sm font-medium mr-1 flex-shrink-0">
            {batch.selectedSongIds.size} selected
          </span>
          <button
            onClick={batch.handleBatchDownload}
            disabled={batch.batchDownloading}
            aria-label="Download selected songs as ZIP"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-gray-700 hover:bg-gray-600 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            <span className="hidden sm:inline">
              {batch.batchDownloading && batch.batchDownloadProgress
                ? `${batch.batchDownloadProgress.completed}/${batch.batchDownloadProgress.total}`
                : "Download"}
            </span>
          </button>
          <button
            onClick={() => batch.setShowBatchDeleteConfirm(true)}
            disabled={batch.batchLoading}
            aria-label="Remove selected from playlist"
            className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 hover:bg-red-500 disabled:opacity-50 transition-colors min-h-[44px]"
          >
            <TrashIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Remove</span>
          </button>
          <button
            onClick={() => batch.setSelectedSongIds(new Set())}
            aria-label="Clear selection"
            className="flex-shrink-0 flex items-center justify-center w-9 h-9 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-colors"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Activity feed — collaborative playlists only */}
      {collab.isCollaborative && (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl overflow-hidden">
          <button
            onClick={activity.handleToggleActivityFeed}
            className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
          >
            <span className="flex items-center gap-2">
              <UserGroupIcon className="w-4 h-4 text-violet-500" />
              Activity feed
            </span>
            <span className="text-xs text-gray-400">{activity.showActivityFeed ? "▲" : "▼"}</span>
          </button>

          {activity.showActivityFeed && (
            <div className="border-t border-gray-100 dark:border-gray-800 px-4 py-3 space-y-3">
              {activity.activityLoading ? (
                <p className="text-xs text-gray-400 text-center py-2">Loading…</p>
              ) : activity.activities.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">No activity yet. Start adding songs!</p>
              ) : (
                activity.activities.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-full bg-violet-100 dark:bg-violet-900 flex items-center justify-center text-xs font-medium text-violet-700 dark:text-violet-300 overflow-hidden flex-shrink-0 mt-0.5">
                      {(a.user?.avatarUrl ?? a.user?.image) ? (
                        <Image
                          src={(a.user?.avatarUrl ?? a.user?.image)!}
                          alt={a.user?.name ?? "User"}
                          width={28}
                          height={28}
                          className="object-cover w-full h-full"
                        />
                      ) : (
                        (a.user?.name?.[0] ?? "?").toUpperCase()
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        <span className="font-medium">{a.user?.name ?? "Someone"}</span>
                        {" "}
                        {a.type === "song_added_to_playlist" ? "added" : "removed"}
                        {" "}
                        <span className="font-medium">{a.song?.title ?? "a song"}</span>
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(a.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
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
                {batch.batchLoading ? "Removing…" : "Remove"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
