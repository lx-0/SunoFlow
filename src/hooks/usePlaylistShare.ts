"use client";

import { useState, useCallback } from "react";
import { apiPatch } from "@/lib/api-client";

interface UsePlaylistShareOptions {
  playlistId: string;
  initialIsPublic: boolean;
  initialSlug: string | null;
  toast: (message: string, type: "success" | "error") => void;
}

export function usePlaylistShare({
  playlistId,
  initialIsPublic,
  initialSlug,
  toast,
}: UsePlaylistShareOptions) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [slug, setSlug] = useState<string | null>(initialSlug);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isTogglingShare, setIsTogglingShare] = useState(false);

  const handleToggleShare = useCallback(async () => {
    if (isTogglingShare) return;
    setIsTogglingShare(true);
    try {
      const data = await apiPatch<{ isPublic: boolean; slug: string | null }>(`/api/playlists/${playlistId}/share`, {});
      setIsPublic(data.isPublic);
      setSlug(data.slug);
      toast(
        data.isPublic ? "Playlist is now public" : "Playlist is now private",
        "success"
      );
    } catch {
      toast("Failed to update sharing", "error");
    } finally {
      setIsTogglingShare(false);
    }
  }, [isTogglingShare, playlistId, toast]);

  const handleCopyLink = useCallback(() => {
    if (!slug) return;
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard
      .writeText(url)
      .then(() => toast("Link copied!", "success"));
  }, [slug, toast]);

  const handleCopyEmbed = useCallback(() => {
    if (!slug) return;
    const url = `${window.location.origin}/embed/playlist/${slug}`;
    const code = `<iframe src="${url}" width="400" height="500" frameborder="0" allow="autoplay"></iframe>`;
    navigator.clipboard
      .writeText(code)
      .then(() => toast("Embed code copied!", "success"));
  }, [slug, toast]);

  const toggleSharePanel = useCallback(
    (closeCollabPanel?: () => void) => {
      setShowSharePanel((v) => !v);
      closeCollabPanel?.();
    },
    []
  );

  return {
    isPublic,
    setIsPublic,
    slug,
    setSlug,
    showSharePanel,
    setShowSharePanel,
    isTogglingShare,
    handleToggleShare,
    handleCopyLink,
    handleCopyEmbed,
    toggleSharePanel,
  };
}
