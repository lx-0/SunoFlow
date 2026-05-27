"use client";

import { useState, useEffect, useCallback } from "react";

interface UsePlaylistPublishOptions {
  playlistId: string;
  initialIsPublished: boolean;
  initialGenre: string;
  songCount: number;
  toast: (message: string, type: "success" | "error") => void;
  onPublicityChange?: (isPublic: boolean, slug: string | null) => void;
}

export function usePlaylistPublish({
  playlistId,
  initialIsPublished,
  initialGenre,
  songCount,
  toast,
  onPublicityChange,
}: UsePlaylistPublishOptions) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [publishedGenre, setPublishedGenre] = useState(initialGenre);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [genres, setGenres] = useState<{ name: string; count: number }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre);

  useEffect(() => {
    fetch("/api/songs/genres")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.genres) setGenres(data.genres);
      })
      .catch(() => {});
  }, []);

  const handlePublish = useCallback(async () => {
    if (isPublishing) return;
    if (songCount === 0) {
      toast("Playlist must have at least 1 song to publish", "error");
      setShowPublishConfirm(false);
      return;
    }
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/publish`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre: selectedGenre || null }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        toast(data?.error ?? "Failed to publish", "error");
        return;
      }
      const data = await res.json();
      setIsPublished(data.isPublished);
      if (data.genre) setPublishedGenre(data.genre);
      onPublicityChange?.(data.isPublic, data.slug);
      toast("Playlist published to Discover!", "success");
    } catch {
      toast("Failed to publish", "error");
    } finally {
      setIsPublishing(false);
      setShowPublishConfirm(false);
    }
  }, [isPublishing, songCount, playlistId, selectedGenre, toast, onPublicityChange]);

  const handleUnpublish = useCallback(async () => {
    if (isPublishing) return;
    setIsPublishing(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/publish`, {
        method: "PATCH",
      });
      if (!res.ok) {
        toast("Failed to unpublish", "error");
        return;
      }
      const data = await res.json();
      setIsPublished(data.isPublished);
      toast("Playlist removed from Discover", "success");
    } catch {
      toast("Failed to unpublish", "error");
    } finally {
      setIsPublishing(false);
      setShowUnpublishConfirm(false);
    }
  }, [isPublishing, playlistId, toast]);

  const openPublish = useCallback(() => {
    setSelectedGenre(publishedGenre);
    setShowPublishConfirm(true);
  }, [publishedGenre]);

  const openUnpublish = useCallback(() => {
    setShowUnpublishConfirm(true);
  }, []);

  return {
    isPublished,
    publishedGenre,
    showPublishConfirm,
    setShowPublishConfirm,
    showUnpublishConfirm,
    setShowUnpublishConfirm,
    isPublishing,
    genres,
    selectedGenre,
    setSelectedGenre,
    handlePublish,
    handleUnpublish,
    openPublish,
    openUnpublish,
  };
}
