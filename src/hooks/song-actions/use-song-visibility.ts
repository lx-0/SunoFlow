"use client";

import { useCallback, useState } from "react";
import { track } from "@/lib/analytics";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import { type ToastFn } from "@/components/Toast";
import { callApi, jsonPatch } from "./call-api";


interface UseSongVisibilityParams {
  songId: string;
  songTitle: string | null;
  initialIsPublic: boolean;
  initialPublicSlug: string | null;
  toast: ToastFn;
}

export function useSongVisibility({
  songId,
  songTitle,
  initialIsPublic,
  initialPublicSlug,
  toast,
}: UseSongVisibilityParams) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);

  const [setVisibility, sharing] = useAsyncAction(async (visibility: "public" | "private") => {
    const data = await callApi<{ isPublic: boolean; publicSlug: string | null }>(
      `/api/songs/${songId}`,
      jsonPatch({ visibility }),
      toast,
      "Failed to update visibility",
    );
    if (!data) return;
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
  });

  const handleVisibilityToggle = useCallback(() => {
    if (!isPublic) {
      return "confirm-public" as const;
    }
    setVisibility("private");
    return null;
  }, [isPublic, setVisibility]);

  const handleCopyLink = useCallback(async () => {
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
  }, [publicSlug, songId, songTitle, toast]);

  const handleShareOnX = useCallback(() => {
    if (!publicSlug) return;
    const url = `${window.location.origin}/s/${publicSlug}`;
    const title = songTitle ?? "Check out this song";
    const tweetText = `${title} — listen on SunoFlow`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
    track("song_shared", { songId, source: "song_detail", method: "twitter" });
  }, [publicSlug, songId, songTitle]);

  return {
    isPublic,
    publicSlug,
    sharing,
    setVisibility,
    handleVisibilityToggle,
    handleCopyLink,
    handleShareOnX,
  };
}
