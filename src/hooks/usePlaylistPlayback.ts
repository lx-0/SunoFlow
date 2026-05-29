"use client";

import { useCallback } from "react";
import type { Song } from "@prisma/client";
import { useToast } from "@/components/Toast";
import { useQueue, type QueueSong } from "@/components/QueueContext";
import { songToQueueSong } from "@/lib/song-mappers";
import type { PlaylistSongItem } from "./usePlaylistBatchOps";

interface UsePlaylistPlaybackOptions {
  playlistId: string;
  playlistName: string;
  songs: PlaylistSongItem[];
  setSongs: React.Dispatch<React.SetStateAction<PlaylistSongItem[]>>;
}

export function usePlaylistPlayback({
  playlistId,
  playlistName,
  songs,
  setSongs,
}: UsePlaylistPlaybackOptions) {
  const { toast } = useToast();
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

  function buildPlaylistQueue(): QueueSong[] {
    return songs
      .map((ps) => songToQueueSong(ps.song))
      .filter((s): s is QueueSong => s !== null);
  }

  function handleTogglePlay(song: Song) {
    const qs = songToQueueSong(song);
    if (!qs) return;

    if (currentSongId === song.id) {
      togglePlay(qs);
      return;
    }

    const queueSongs = buildPlaylistQueue();
    const idx = queueSongs.findIndex((s) => s.id === song.id);
    playQueue(queueSongs, idx >= 0 ? idx : 0, playlistName);
  }

  function handlePlayAll() {
    const queueSongs = buildPlaylistQueue();
    if (queueSongs.length > 0) {
      playQueue(queueSongs, 0, playlistName);
    }
  }

  const handleRemoveSong = useCallback(
    async (songId: string) => {
      setSongs((prev) => prev.filter((ps) => ps.songId !== songId));

      try {
        const res = await fetch(
          `/api/playlists/${playlistId}/songs/${songId}`,
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
    [playlistId, songs, setSongs, toast]
  );

  return {
    currentSongId,
    isPlaying,
    playNext,
    addToQueue,
    handleTogglePlay,
    handlePlayAll,
    handleRemoveSong,
  };
}
