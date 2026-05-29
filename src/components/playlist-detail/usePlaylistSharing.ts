"use client";

import { useState } from "react";

interface UsePlaylistSharingParams {
  playlistId: string;
  initialIsPublic: boolean;
  initialSlug: string | null;
  toast: (msg: string, type: "success" | "error" | "info") => void;
}

export function usePlaylistSharing({
  playlistId,
  initialIsPublic,
  initialSlug,
  toast,
}: UsePlaylistSharingParams) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [slug, setSlug] = useState(initialSlug);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [isTogglingShare, setIsTogglingShare] = useState(false);

  async function handleToggleShare() {
    if (isTogglingShare) return;
    setIsTogglingShare(true);
    try {
      const res = await fetch(`/api/playlists/${playlistId}/share`, {
        method: "PATCH",
      });
      if (!res.ok) {
        toast("Failed to update sharing", "error");
        return;
      }
      const data = await res.json();
      setIsPublic(data.isPublic);
      setSlug(data.slug);
      toast(data.isPublic ? "Playlist is now public" : "Playlist is now private", "success");
    } catch {
      toast("Failed to update sharing", "error");
    } finally {
      setIsTogglingShare(false);
    }
  }

  function handleCopyLink() {
    if (!slug) return;
    const url = `${window.location.origin}/p/${slug}`;
    navigator.clipboard.writeText(url).then(() => toast("Link copied!", "success"));
  }

  function handleCopyEmbed() {
    if (!slug) return;
    const url = `${window.location.origin}/embed/playlist/${slug}`;
    const code = `<iframe src="${url}" width="400" height="500" frameborder="0" allow="autoplay"></iframe>`;
    navigator.clipboard.writeText(code).then(() => toast("Embed code copied!", "success"));
  }

  return {
    isPublic,
    slug,
    showSharePanel,
    isTogglingShare,
    setIsPublic,
    setSlug,
    setShowSharePanel,
    handleToggleShare,
    handleCopyLink,
    handleCopyEmbed,
  };
}
