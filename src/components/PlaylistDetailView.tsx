"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { MusicalNoteIcon, ArrowLeftIcon } from "@heroicons/react/24/outline";
import { PlayIcon } from "@heroicons/react/24/solid";
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
import { PlaylistSongListItem } from "./playlist-detail/PlaylistSongListItem";

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
          <PlayIcon className="w-4 h-4" />
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
