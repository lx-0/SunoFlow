"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  PlayIcon,
  PauseIcon,
  MusicalNoteIcon,
  TrashIcon,
  ArrowLeftIcon,
  Bars3Icon,
  PencilIcon,
} from "@heroicons/react/24/outline";
import { PlayIcon as PlaySolidIcon } from "@heroicons/react/24/solid";
import type { Song } from "@prisma/client";
import { useToast } from "./Toast";

function formatTime(seconds: number): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface PlaylistSongItem {
  id: string;
  songId: string;
  position: number;
  song: Song;
}

interface PlaylistData {
  id: string;
  name: string;
  description: string | null;
  songs: PlaylistSongItem[];
  _count: { songs: number };
}

export function PlaylistDetailView({
  playlist: initialPlaylist,
}: {
  playlist: PlaylistData;
}) {
  const { toast } = useToast();
  const router = useRouter();
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const [playlist, setPlaylist] = useState(initialPlaylist);
  const [songs, setSongs] = useState(initialPlaylist.songs);
  const [currentSongId, setCurrentSongId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(initialPlaylist.name);
  const [editDesc, setEditDesc] = useState(initialPlaylist.description || "");
  const [saving, setSaving] = useState(false);

  // Drag state
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Create audio element once
  useEffect(() => {
    audioRef.current = new Audio();
    const audio = audioRef.current;

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      // Play next song
      const currentIdx = songs.findIndex(
        (ps) => ps.songId === currentSongId
      );
      if (currentIdx >= 0 && currentIdx < songs.length - 1) {
        const next = songs[currentIdx + 1];
        if (next.song.audioUrl) {
          audio.src = next.song.audioUrl;
          setCurrentSongId(next.songId);
          setCurrentTime(0);
          setAudioDuration(next.song.duration ?? 0);
          audio.play().catch(console.error);
          return;
        }
      }
      setIsPlaying(false);
      setCurrentSongId(null);
      setCurrentTime(0);
    };
    const onTimeUpdate = () => setCurrentTime(audio.currentTime);
    const onDurationChange = () => setAudioDuration(audio.duration);

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    audio.addEventListener("durationchange", onDurationChange);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      audio.removeEventListener("durationchange", onDurationChange);
      audio.pause();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update ended handler when songs/currentSongId changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onEnded = () => {
      const currentIdx = songs.findIndex(
        (ps) => ps.songId === currentSongId
      );
      if (currentIdx >= 0 && currentIdx < songs.length - 1) {
        const next = songs[currentIdx + 1];
        if (next.song.audioUrl) {
          audio.src = next.song.audioUrl;
          setCurrentSongId(next.songId);
          setCurrentTime(0);
          setAudioDuration(next.song.duration ?? 0);
          audio.play().catch(console.error);
          return;
        }
      }
      setIsPlaying(false);
      setCurrentSongId(null);
      setCurrentTime(0);
    };

    audio.addEventListener("ended", onEnded);
    return () => audio.removeEventListener("ended", onEnded);
  }, [songs, currentSongId]);

  function handleTogglePlay(song: Song) {
    const audio = audioRef.current;
    if (!audio || !song.audioUrl) return;

    if (currentSongId === song.id) {
      if (isPlaying) {
        audio.pause();
      } else {
        audio.play().catch(console.error);
      }
    } else {
      audio.pause();
      audio.src = song.audioUrl;
      setCurrentSongId(song.id);
      setCurrentTime(0);
      setAudioDuration(song.duration ?? 0);
      audio.play().catch(console.error);
    }
  }

  function handlePlayAll() {
    if (songs.length === 0) return;
    const first = songs[0];
    if (!first.song.audioUrl) return;

    const audio = audioRef.current;
    if (!audio) return;

    audio.pause();
    audio.src = first.song.audioUrl;
    setCurrentSongId(first.songId);
    setCurrentTime(0);
    setAudioDuration(first.song.duration ?? 0);
    audio.play().catch(console.error);
  }

  const handleRemoveSong = useCallback(
    async (songId: string) => {
      // Optimistic removal
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

  // Drag and drop reorder
  function handleDragStart(index: number) {
    setDragIndex(index);
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault();
    setDragOverIndex(index);
  }

  async function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault();
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const reordered = [...songs];
    const [moved] = reordered.splice(dragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setSongs(reordered);
    setDragIndex(null);
    setDragOverIndex(null);

    try {
      const res = await fetch(`/api/playlists/${playlist.id}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          songIds: reordered.map((ps) => ps.songId),
        }),
      });
      if (!res.ok) {
        setSongs(songs);
        toast("Failed to reorder", "error");
      }
    } catch {
      setSongs(songs);
      toast("Failed to reorder", "error");
    }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editName.trim() || saving) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          description: editDesc.trim() || null,
        }),
      });
      if (!res.ok) {
        toast("Failed to update playlist", "error");
        return;
      }
      const data = await res.json();
      setPlaylist((prev) => ({ ...prev, ...data.playlist }));
      setEditing(false);
      toast("Playlist updated", "success");
    } catch {
      toast("Failed to update playlist", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      const res = await fetch(`/api/playlists/${playlist.id}`, {
        method: "DELETE",
      });
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
      {editing ? (
        <form onSubmit={handleSaveEdit} className="space-y-3">
          <input
            type="text"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            maxLength={100}
            autoFocus
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <input
            type="text"
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            placeholder="Description (optional)"
            className="w-full bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={!editName.trim() || saving}
              className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors disabled:opacity-50 min-h-[44px]"
            >
              {saving ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setEditName(playlist.name);
                setEditDesc(playlist.description || "");
              }}
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
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-0.5">
              {songs.length} song{songs.length !== 1 ? "s" : ""}
              {totalDuration > 0 && ` · ${formatTime(totalDuration)}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditing(true)}
              aria-label="Edit playlist"
              className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleDelete}
              aria-label="Delete playlist"
              className="w-11 h-11 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
            >
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Play all button */}
      {songs.length > 0 && !editing && (
        <button
          onClick={handlePlayAll}
          className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium bg-violet-600 hover:bg-violet-500 text-white transition-colors min-h-[44px]"
        >
          <PlaySolidIcon className="w-4 h-4" />
          Play All
        </button>
      )}

      {/* Player bar */}
      {currentSongId && (
        <div className="bg-white dark:bg-gray-900 border border-violet-600 rounded-xl p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                const ps = songs.find((s) => s.songId === currentSongId);
                if (ps) handleTogglePlay(ps.song);
              }}
              className="w-10 h-10 rounded-full bg-violet-600 hover:bg-violet-500 text-white flex items-center justify-center flex-shrink-0"
            >
              {isPlaying ? (
                <PauseIcon className="w-5 h-5" />
              ) : (
                <PlayIcon className="w-5 h-5 ml-0.5" />
              )}
            </button>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                {songs.find((s) => s.songId === currentSongId)?.song.title ??
                  "Untitled"}
              </p>
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span>{formatTime(currentTime)}</span>
                <div className="flex-1 h-1 bg-gray-200 dark:bg-gray-700 rounded-full">
                  <div
                    className="h-full bg-violet-500 rounded-full transition-all"
                    style={{
                      width: `${audioDuration > 0 ? (currentTime / audioDuration) * 100 : 0}%`,
                    }}
                  />
                </div>
                <span>{formatTime(audioDuration)}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Song list */}
      {songs.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-8 text-center">
          <p className="text-gray-500 text-sm">
            No songs in this playlist yet. Add songs from your library.
          </p>
        </div>
      ) : (
        <ul className="space-y-1">
          {songs.map((ps, index) => {
            const isActive = currentSongId === ps.songId;
            const hasAudio = Boolean(ps.song.audioUrl);
            const isDragOver = dragOverIndex === index;

            return (
              <li
                key={ps.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={() => {
                  setDragIndex(null);
                  setDragOverIndex(null);
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive
                    ? "bg-violet-50 dark:bg-violet-900/20 border border-violet-300 dark:border-violet-700"
                    : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                } ${isDragOver ? "border-violet-400 dark:border-violet-500" : ""} ${
                  dragIndex === index ? "opacity-50" : ""
                }`}
              >
                {/* Drag handle */}
                <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600">
                  <Bars3Icon className="w-5 h-5" />
                </div>

                {/* Position number */}
                <span className="flex-shrink-0 w-6 text-xs text-gray-400 dark:text-gray-500 text-center">
                  {index + 1}
                </span>

                {/* Cover art */}
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
                  {ps.song.imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={ps.song.imageUrl}
                      alt={ps.song.title ?? "Song"}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <MusicalNoteIcon className="w-5 h-5 text-gray-400 dark:text-gray-600" />
                  )}
                </div>

                {/* Title + duration */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/library/${ps.songId}`}
                    className="block text-sm font-medium text-gray-900 dark:text-white truncate hover:text-violet-400 transition-colors"
                  >
                    {ps.song.title ?? "Untitled"}
                  </Link>
                  {ps.song.duration && (
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {formatTime(ps.song.duration)}
                    </span>
                  )}
                </div>

                {/* Play button */}
                <button
                  onClick={() => handleTogglePlay(ps.song)}
                  disabled={!hasAudio}
                  aria-label={
                    isActive && isPlaying ? "Pause" : "Play"
                  }
                  className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
                    hasAudio
                      ? "bg-violet-600 hover:bg-violet-500 text-white"
                      : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
                  }`}
                >
                  {isActive && isPlaying ? (
                    <PauseIcon className="w-4 h-4" />
                  ) : (
                    <PlayIcon className="w-4 h-4 ml-0.5" />
                  )}
                </button>

                {/* Remove button */}
                <button
                  onClick={() => handleRemoveSong(ps.songId)}
                  aria-label="Remove from playlist"
                  className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
