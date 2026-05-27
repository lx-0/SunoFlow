"use client";

import { useState, useRef, useEffect } from "react";

interface PlaylistSongItem {
  id: string;
  songId: string;
  position: number;
  song: { id: string };
}

export function usePlaylistDragReorder<T extends PlaylistSongItem>(
  playlistId: string,
  songs: T[],
  setSongs: React.Dispatch<React.SetStateAction<T[]>>,
  toast: (message: string, type: "success" | "error") => void,
) {
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
      fetch(`/api/playlists/${playlistId}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds: reordered.map((ps) => ps.songId) }),
      }).then((res) => {
        if (!res.ok) {
          setSongs(prev);
          toast("Failed to reorder", "error");
        }
      }).catch(() => {
        setSongs(prev);
        toast("Failed to reorder", "error");
      });
    }

    document.addEventListener("touchmove", onTouchMove, { passive: false });
    document.addEventListener("touchend", onTouchEnd);
    return () => {
      document.removeEventListener("touchmove", onTouchMove);
      document.removeEventListener("touchend", onTouchEnd);
    };
  }, [playlistId, setSongs, toast]);

  function handleDragHandleTouchStart(index: number) {
    touchDragActive.current = true;
    touchDragFrom.current = index;
    touchDragTo.current = index;
    setDragIndex(index);
    setDragOverIndex(index);
  }

  async function handleKeyboardReorder(index: number, direction: "up" | "down") {
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= songs.length) return;
    const prev = [...songs];
    const reordered = [...songs];
    const [moved] = reordered.splice(index, 1);
    reordered.splice(newIndex, 0, moved);
    setSongs(reordered);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds: reordered.map((ps) => ps.songId) }),
      });
      if (!res.ok) {
        setSongs(prev);
        toast("Failed to reorder", "error");
      }
    } catch {
      setSongs(prev);
      toast("Failed to reorder", "error");
    }
  }

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
      const res = await fetch(`/api/playlists/${playlistId}/reorder`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songIds: reordered.map((ps) => ps.songId) }),
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

  function handleDragEnd() {
    setDragIndex(null);
    setDragOverIndex(null);
  }

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
