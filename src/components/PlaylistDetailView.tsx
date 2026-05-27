"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  MusicalNoteIcon,
  Bars3Icon,
  ForwardIcon,
  QueueListIcon,
  TrashIcon,
  ArrowLeftIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon as PlaySolidIcon, CheckIcon } from "@heroicons/react/24/solid";
import type { Song } from "@prisma/client";
import { useToast } from "./Toast";
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
import { usePlaylistPlayback } from "@/hooks/usePlaylistPlayback";
import { PlaylistHeader } from "./playlist-detail/PlaylistHeader";
import { CollaboratorAvatars, CollaborativePanel } from "./playlist-detail/CollaborativePanel";
import { SharePanel } from "./playlist-detail/SharePanel";
import { ActivityFeed } from "./playlist-detail/ActivityFeed";
import { PublishSheets } from "./playlist-detail/PublishSheets";
import { BatchToolbar } from "./playlist-detail/BatchToolbar";

interface PlaylistCollaboratorItem {
  id: string;
  userId: string | null;
  status: string;
  role?: string;
  user: {
    id: string;
    name: string | null;
    image: string | null;
    avatarUrl: string | null;
    username?: string | null;
  } | null;
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

  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [songs, setSongs] = useState(initialPlaylist.songs);

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

  const playback = usePlaylistPlayback({
    playlistId: playlist.id,
    playlistName: playlist.name,
    songs,
    setSongs,
  });

  const totalDuration = songs.reduce(
    (sum, ps) => sum + (ps.song.duration ?? 0),
    0
  );

  return (
    <div className="px-4 py-4 space-y-4">
      <Link
        href="/playlists"
        className="inline-flex items-center gap-1 text-sm text-gray-500 dark:text-gray-400 hover:text-violet-400 transition-colors"
      >
        <ArrowLeftIcon className="w-4 h-4" />
        Playlists
      </Link>

      <PlaylistHeader
        playlist={playlist}
        editing={editing}
        share={share}
        collab={collab}
        publish={publish}
        batch={batch}
        songCount={songs.length}
        totalDuration={totalDuration}
        isOwner={isOwner}
      />

      <CollaboratorAvatars
        collaborators={collab.collaborators}
        isCollaborative={collab.isCollaborative}
        isEditing={editing.editing}
      />

      <CollaborativePanel
        collab={collab}
        isEditing={editing.editing}
        isOwner={isOwner}
      />

      <SharePanel share={share} isEditing={editing.editing} />

      {songs.length > 0 && !editing.editing && (
        <button
          onClick={playback.handlePlayAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors min-h-[44px]"
        >
          <PlaySolidIcon className="w-4 h-4" />
          Play All
        </button>
      )}

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

      <PublishSheets
        publish={publish}
        isPublic={share.isPublic}
        songCount={songs.length}
      />

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
            const isActive = playback.currentSongId === ps.songId;
            const hasAudio = Boolean(ps.song.audioUrl);
            const isDragOver = reorder.dragOverIndex === index;
            const isSelected = batch.selectedSongIds.has(ps.songId);

            return (
              <SwipeablePlaylistItem
                key={ps.id}
                onSwipeRemove={batch.selectionMode ? () => {} : () => playback.handleRemoveSong(ps.songId)}
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
                  isPlaying={playback.isPlaying}
                  isCollaborative={collab.isCollaborative}
                  onDragStart={() => reorder.handleDragStart(index)}
                  onDragOver={(e: React.DragEvent) => reorder.handleDragOver(e, index)}
                  onDrop={(e: React.DragEvent) => reorder.handleDrop(e, index)}
                  onDragEnd={reorder.handleDragEnd}
                  onDragHandleTouchStart={() => reorder.handleDragHandleTouchStart(index)}
                  onKeyboardReorder={(dir) => reorder.handleKeyboardReorder(index, dir)}
                  isFirst={index === 0}
                  isLast={index === songs.length - 1}
                  onTogglePlay={() => playback.handleTogglePlay(ps.song)}
                  onPlayNext={() => { const qs = songToQueueSong(ps.song); if (qs) playback.playNext(qs); }}
                  onAddToQueue={() => { const qs = songToQueueSong(ps.song); if (qs) playback.addToQueue(qs); }}
                  onRemove={() => playback.handleRemoveSong(ps.songId)}
                  onToggleSelect={() => batch.handleToggleSelect(ps.songId)}
                  onLongPress={() => batch.setSelectedSongIds(new Set([ps.songId]))}
                />
              </SwipeablePlaylistItem>
            );
          })}
        </ul>
      )}

      <BatchToolbar batch={batch} />

      <ActivityFeed activity={activity} isCollaborative={collab.isCollaborative} />
    </div>
  );
}
