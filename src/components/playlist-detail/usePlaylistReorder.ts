"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { PlaylistSongItem } from "./types";
import { apiPatch } from "@/lib/api-client";

interface UsePlaylistReorderOptions {
  playlistId: string;
  songs: PlaylistSongItem[];
  setSongs: React.Dispatch<React.SetStateAction<PlaylistSongItem[]>>;
  onError: (message: string) => void;
}

export function usePlaylistReorder({ playlistId, songs, setSongs, onError }: UsePlaylistReorderOptions) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const touchDragActive = useRef(false);
  const touchDragFrom = useRef<number | null>(null);
  const touchDragTo = useRef<number | null>(null);
  const touchCurrentSongs = useRef(songs);

  useEffect(() => {
    touchCurrentSongs.current = songs;
  }, [songs]);

  useEffect(() => {
    function onTouchMove(e: TouchEvent) {
      if (!touchDragActive.current) return;
      e.preventDefault();
      const touch = e.touches[0];
      let target: Element | null = document.elementFromPoint(touch.clientX, touch.clientY);
      while (target && !target.hasAttribute("data-drag-index")) {
        target = target.parentElement;
      }
      if (target) {
        const idx = parseInt(target.getAttribute("data-drag-index") ?? "-1", 10);
        if (idx >= 0 && idx !== touchDragTo.current) {
          touchDragTo.current = idx;
          setDragOverIndex(idx);
        }
      }
    }

    function onTouchEnd() {
      if (!touchDragActive.current) return;
      touchDragActive.current = false;
      const from = touchDragFrom.current;
      const to = touchDragTo.current;
      touchDragFrom.current = null;
      touchDragTo.current = null;
      setDragIndex(null);
      setDragOverIndex(null);
      if (from === null || to === null || from === to) return;
      const prev = touchCurrentSongs.current;
      const reordered = [...prev];
      const [moved] = reordered.splice(from, 1);
      reordered.splice(to, 0, moved);
      setSongs(reordered);
      apiPatch(`/api/playlists/${playlistId}/reorder`, { songIds: reordered.map((ps) => ps.songId) })
        .catch(() => {
          setSongs(prev);
          onError("Failed to reorder");
        });
    }

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [playlistId, setSongs, onError]);

  const handleDragHandleTouchStart = useCallback((index: number) => {
    touchDragActive.current = true;
    touchDragFrom.current = index;
    touchDragTo.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
  }, []);

  const handleKeyboardReorder = useCallback(async (index: number, direction: "up" | "down") => {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= songs.length) return;
    const prev = [...songs];
    const reordered = [...songs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setSongs(reordered);
    try {
      await apiPatch(`/api/playlists/${playlistId}/reorder`, { songIds: reordered.map((ps) => ps.songId) });
    } catch {
      setSongs(prev);
      onError("Failed to reorder");
    }
  }, [songs, playlistId, setSongs, onError]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
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
      await apiPatch(`/api/playlists/${playlistId}/reorder`, { songIds: reordered.map((ps) => ps.songId) });
    } catch {
      setSongs(songs);
      onError("Failed to reorder");
    }
  }, [dragIndex, songs, playlistId, setSongs, onError]);

  const handleDragEnd = useCallback(() => {
    setDragIndex(null);
    setDragOverIndex(null);
  }, []);

  return {
    dragIndex,
    dragOverIndex,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
    handleDragHandleTouchStart,
    handleKeyboardReorder,
  };
}
