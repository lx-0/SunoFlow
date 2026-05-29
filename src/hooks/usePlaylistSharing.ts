"use client";

import { useState } from "react";

export function usePlaylistSharing(
  playlistId: string,
  initialIsPublic: boolean,
  initialSlug: string | null,
  toast: (message: string, type: "success" | "error") => void,
) {
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
    setIsPublic,
    slug,
    setSlug,
    showSharePanel,
    setShowSharePanel,
    isTogglingShare,
    handleToggleShare,
    handleCopyLink,
    handleCopyEmbed,
  };
}
