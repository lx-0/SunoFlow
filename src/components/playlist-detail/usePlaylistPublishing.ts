"use client";

import { useState, useEffect } from "react";

interface PublishResult {
  isPublished: boolean;
  isPublic: boolean;
  slug: string | null;
  genre?: string;
}

interface UsePlaylistPublishingParams {
  playlistId: string;
  initialIsPublished: boolean;
  initialGenre: string | null;
  songCount: number;
  toast: (msg: string, type: "success" | "error" | "info") => void;
  onPublished?: (data: PublishResult) => void;
}

export function usePlaylistPublishing({
  playlistId,
  initialIsPublished,
  initialGenre,
  songCount,
  toast,
  onPublished,
}: UsePlaylistPublishingParams) {
  const [isPublished, setIsPublished] = useState(initialIsPublished);
  const [publishedGenre, setPublishedGenre] = useState(initialGenre ?? "");
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [genres, setGenres] = useState<{ name: string; count: number }[]>([]);
  const [selectedGenre, setSelectedGenre] = useState(initialGenre ?? "");

  useEffect(() => {
    fetch("/api/songs/genres")
      .then((res) => res.ok ? res.json() : null)
      .then((data) => { if (data?.genres) setGenres(data.genres); })
      .catch(() => {});
  }, []);

  async function handlePublish() {
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
      onPublished?.(data);
      toast("Playlist published to Discover!", "success");
    } catch {
      toast("Failed to publish", "error");
    } finally {
      setIsPublishing(false);
      setShowPublishConfirm(false);
    }
  }

  async function handleUnpublish() {
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
  }

  function openPublishDialog() {
    setSelectedGenre(publishedGenre);
    setShowPublishConfirm(true);
  }

  return {
    isPublished,
    publishedGenre,
    showPublishConfirm,
    showUnpublishConfirm,
    isPublishing,
    genres,
    selectedGenre,
    setSelectedGenre,
    setShowPublishConfirm,
    setShowUnpublishConfirm,
    handlePublish,
    handleUnpublish,
    openPublishDialog,
  };
}
