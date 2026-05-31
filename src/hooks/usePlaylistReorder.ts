"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { apiPatch } from "@/lib/api-client";

interface PlaylistSongItemBase {
  id: string;
  songId: string;
  position: number;
}

interface UsePlaylistReorderOptions<T extends PlaylistSongItemBase> {
  playlistId: string;
  songs: T[];
  setSongs: React.Dispatch<React.SetStateAction<T[]>>;
  toast: (message: string, type: "success" | "error") => void;
}

async function persistReorder<T extends PlaylistSongItemBase>(
  playlistId: string,
  reordered: T[],
  onError: () => void,
  toast: (message: string, type: "success" | "error") => void,
) {
  try {
    await apiPatch(`/api/playlists/${playlistId}/reorder`, { songIds: reordered.map((ps) => ps.songId) });
  } catch {
    onError();
    toast("Failed to reorder", "error");
  }
}

export function usePlaylistReorder<T extends PlaylistSongItemBase>({
  playlistId,
  songs,
  setSongs,
  toast,
}: UsePlaylistReorderOptions<T>) {
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
      persistReorder(playlistId, reordered, () => setSongs(prev), toast);
    }

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [playlistId, setSongs, toast]);

  const handleDragHandleTouchStart = useCallback((index: number) => {
    touchDragActive.current = true;
    touchDragFrom.current = index;
    touchDragTo.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
  }, []);

  const handleKeyboardReorder = useCallback(async (index: number, direction: "up" | "down") => {
    const currentSongs = touchCurrentSongs.current;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= currentSongs.length) return;
    const prev = [...currentSongs];
    const reordered = [...currentSongs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setSongs(reordered);
    await persistReorder(playlistId, reordered, () => setSongs(prev), toast);
  }, [playlistId, setSongs, toast]);

  const handleDragStart = useCallback((index: number) => {
    setDragIndex(index);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const currentDragIndex = dragIndex;
    if (currentDragIndex === null || currentDragIndex === dropIndex) {
      setDragIndex(null);
      setDragOverIndex(null);
      return;
    }

    const currentSongs = touchCurrentSongs.current;
    const reordered = [...currentSongs];
    const [moved] = reordered.splice(currentDragIndex, 1);
    reordered.splice(dropIndex, 0, moved);

    setSongs(reordered);
    setDragIndex(null);
    setDragOverIndex(null);

    await persistReorder(playlistId, reordered, () => setSongs(currentSongs), toast);
  }, [dragIndex, playlistId, setSongs, toast]);

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
