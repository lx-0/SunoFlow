"use client";

import { useState } from "react";
import { track } from "@/lib/analytics";

interface UseSongVisibilityOptions {
  songId: string;
  initialIsPublic: boolean;
  initialPublicSlug: string | null;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
}

export function useSongVisibility({
  songId,
  initialIsPublic,
  initialPublicSlug,
  toast,
}: UseSongVisibilityOptions) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [sharing, setSharing] = useState(false);
  const [confirmPublicOpen, setConfirmPublicOpen] = useState(false);

  async function setVisibility(visibility: "public" | "private") {
    setSharing(true);
    try {
      const res = await fetch(`/api/songs/${songId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility }),
      });
      if (!res.ok) {
        toast("Failed to update visibility", "error");
        return;
      }
      const data = await res.json();
      setIsPublic(data.isPublic);
      setPublicSlug(data.publicSlug);

      if (data.isPublic && data.publicSlug) {
        const url = `${window.location.origin}/s/${data.publicSlug}`;
        await navigator.clipboard.writeText(url);
        toast("Public link copied to clipboard", "success");
        track("song_shared", { songId, source: "song_detail" });
      } else {
        toast("Song is now private", "success");
      }
    } catch {
      toast("Failed to update visibility", "error");
    } finally {
      setSharing(false);
    }
  }

  function handleVisibilityToggle() {
    if (!isPublic) {
      setConfirmPublicOpen(true);
    } else {
      setVisibility("private");
    }
  }

  function confirmMakePublic() {
    setConfirmPublicOpen(false);
    setVisibility("public");
  }

  function cancelMakePublic() {
    setConfirmPublicOpen(false);
  }

  async function handleCopyLink(songTitle: string | null) {
    if (!publicSlug) return;
    const url = `${window.location.origin}/s/${publicSlug}`;

    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: songTitle ?? "Check out this song", url });
        track("song_shared", { songId, source: "song_detail", method: "web_share_api" });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    toast("Link copied!", "success");
    track("song_link_copied", { songId, source: "song_detail" });
  }

  function handleShareOnX(songTitle: string | null) {
    if (!publicSlug) return;
    const url = `${window.location.origin}/s/${publicSlug}`;
    const title = songTitle ?? "Check out this song";
    const tweetText = `${title} — listen on SunoFlow`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
    track("song_shared", { songId, source: "song_detail", method: "twitter" });
  }

  return {
    isPublic,
    publicSlug,
    sharing,
    confirmPublicOpen,
    handleVisibilityToggle,
    confirmMakePublic,
    cancelMakePublic,
    handleCopyLink,
    handleShareOnX,
  };
}
