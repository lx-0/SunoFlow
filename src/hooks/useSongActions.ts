"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { track } from "@/lib/analytics";
import { getRating, type SongRating } from "@/lib/ratings";
import type { SunoSong } from "@/lib/sunoapi";
import type { RemixAction } from "@/components/RemixModal";

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;
type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

export interface CompareVariation {
  id: string;
  title: string | null;
  tags: string | null;
  audioUrl: string | null;
  duration: number | null;
  lyrics: string | null;
}
type ExportFormat = "wav" | "midi" | "mp4";
type ExportStatus = "idle" | "converting" | "done" | "error";
type VideoStatus = "idle" | "polling" | "ready" | "error";

interface ExportState {
  status: ExportStatus;
  taskId?: string;
  error?: string;
}

interface UseSongActionsParams {
  song: SunoSong;
  initialFavorite: boolean;
  initialFavoriteCount: number;
  initialIsPublic: boolean;
  initialPublicSlug: string | null;
  initialRating: number | null;
  initialRatingNote: string | null;
  initialIsArchived: boolean;
  initialVariationCount: number;
  maxVariations: number;
  toast: ToastFn;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSongActions({
  song,
  initialFavorite,
  initialFavoriteCount,
  initialIsPublic,
  initialPublicSlug,
  initialRating,
  initialRatingNote,
  initialIsArchived,
  initialVariationCount,
  maxVariations,
  toast,
}: UseSongActionsParams) {
  const router = useRouter();

  // ── Favorite ──────────────────────────────────────────────────────────────
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [favoriteCount, setFavoriteCount] = useState(initialFavoriteCount);

  const handleToggleFavorite = useCallback(async () => {
    const prev = isFavorite;
    const prevCount = favoriteCount;
    const newFav = !prev;
    setIsFavorite(newFav);
    setFavoriteCount(newFav ? prevCount + 1 : Math.max(0, prevCount - 1));
    try {
      const res = await fetch(`/api/songs/${song.id}/favorite`, {
        method: newFav ? "POST" : "DELETE",
      });
      if (!res.ok) {
        setIsFavorite(prev);
        setFavoriteCount(prevCount);
        toast("Failed to update favorite", "error");
      } else {
        const data = await res.json();
        setFavoriteCount(data.favoriteCount);
        toast(newFav ? "Added to favorites" : "Removed from favorites", "success");
      }
    } catch {
      setIsFavorite(prev);
      setFavoriteCount(prevCount);
      toast("Failed to update favorite", "error");
    }
  }, [isFavorite, favoriteCount, song.id, toast]);

  // ── Rating ────────────────────────────────────────────────────────────────
  const [rating, setRatingState] = useState<SongRating>({
    stars: initialRating ?? 0,
    note: initialRatingNote ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [savingRating, setSavingRating] = useState(false);
  const [noteDraft, setNoteDraft] = useState(initialRatingNote ?? "");

  useEffect(() => {
    if (initialRating) return;
    let cancelled = false;
    getRating(song.id).then((existing) => {
      if (cancelled || !existing) return;
      setRatingState(existing);
      setNoteDraft(existing.note);
    });
    return () => { cancelled = true; };
  }, [song.id, initialRating]);

  const handleStarChange = useCallback((stars: number) => {
    setRatingState((r) => ({ ...r, stars }));
    setSaved(false);
  }, []);

  const handleSaveRating = useCallback(async () => {
    if (rating.stars === 0 || savingRating) return;
    const r: SongRating = { stars: rating.stars, note: noteDraft.trim() };
    setSavingRating(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/rating`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stars: r.stars, note: r.note }),
      });
      if (!res.ok) throw new Error("Failed to save rating");
      setRatingState(r);
      setSaved(true);
    } catch {
      toast("Failed to save rating", "error");
    } finally {
      setSavingRating(false);
    }
  }, [rating.stars, savingRating, noteDraft, song.id, toast]);

  // ── Thumbs feedback ───────────────────────────────────────────────────────
  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);
  const [savingThumbs, setSavingThumbs] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/songs/${song.id}/feedback`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.rating) return;
        setThumbsRating(data.rating);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [song.id]);

  const handleThumbsFeedback = useCallback(async (value: "thumbs_up" | "thumbs_down") => {
    if (savingThumbs) return;
    setSavingThumbs(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      if (res.ok) setThumbsRating(value);
    } catch {
      toast("Failed to save feedback", "error");
    } finally {
      setSavingThumbs(false);
    }
  }, [savingThumbs, song.id, toast]);

  // ── Visibility / sharing ──────────────────────────────────────────────────
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialPublicSlug);
  const [sharing, setSharing] = useState(false);

  const setVisibility = useCallback(async (visibility: "public" | "private") => {
    setSharing(true);
    try {
      const res = await fetch(`/api/songs/${song.id}`, {
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
        track("song_shared", { songId: song.id, source: "song_detail" });
      } else {
        toast("Song is now private", "success");
      }
    } catch {
      toast("Failed to update visibility", "error");
    } finally {
      setSharing(false);
    }
  }, [song.id, toast]);

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
        await navigator.share({ title: song.title ?? "Check out this song", url });
        track("song_shared", { songId: song.id, source: "song_detail", method: "web_share_api" });
        return;
      } catch (err) {
        if (err instanceof Error && err.name === "AbortError") return;
      }
    }

    await navigator.clipboard.writeText(url);
    toast("Link copied!", "success");
    track("song_link_copied", { songId: song.id, source: "song_detail" });
  }, [publicSlug, song.id, song.title, toast]);

  const handleShareOnX = useCallback(() => {
    if (!publicSlug) return;
    const url = `${window.location.origin}/s/${publicSlug}`;
    const songTitle = song.title ?? "Check out this song";
    const tweetText = `${songTitle} — listen on SunoFlow`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
    track("song_shared", { songId: song.id, source: "song_detail", method: "twitter" });
  }, [publicSlug, song.id, song.title]);

  // ── Archive / restore ─────────────────────────────────────────────────────
  const [isArchived, setIsArchived] = useState(initialIsArchived);
  const [archiving, setArchiving] = useState(false);

  const handleArchive = useCallback(async () => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/archive`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to archive song", "error");
        return;
      }
      setIsArchived(true);
      toast("Song archived", "success");
      router.push("/library");
    } catch {
      toast("Failed to archive song", "error");
    } finally {
      setArchiving(false);
    }
  }, [song.id, toast, router]);

  const handleRestore = useCallback(async () => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/restore`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to restore song", "error");
        return;
      }
      setIsArchived(false);
      toast("Song restored", "success");
    } catch {
      toast("Failed to restore song", "error");
    } finally {
      setArchiving(false);
    }
  }, [song.id, toast]);

  // ── Appeal ────────────────────────────────────────────────────────────────
  const [appealOpen, setAppealOpen] = useState(false);
  const [appealReason, setAppealReason] = useState("");
  const [appealSubmitting, setAppealSubmitting] = useState(false);
  const [appealStatus, setAppealStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");

  const handleSubmitAppeal = useCallback(async () => {
    if (appealReason.trim().length < 10) return;
    setAppealSubmitting(true);
    try {
      const res = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId: song.id, reason: appealReason.trim() }),
      });
      if (res.status === 409) {
        setAppealStatus("pending");
        setAppealOpen(false);
        toast("You already have a pending appeal for this song.");
        return;
      }
      if (res.ok) {
        setAppealStatus("pending");
        setAppealOpen(false);
        toast("Appeal submitted. We'll review it shortly.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to submit appeal. Please try again.");
      }
    } catch {
      toast("Failed to submit appeal. Please try again.");
    } finally {
      setAppealSubmitting(false);
    }
  }, [appealReason, song.id, toast]);

  // ── Variations / remix ────────────────────────────────────────────────────
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [creatingVariation, setCreatingVariation] = useState(false);
  const [compareVariation, setCompareVariation] = useState<CompareVariation | null>(null);
  const [remixAction, setRemixAction] = useState<RemixAction | null>(null);
  const [remixSubmitting, setRemixSubmitting] = useState(false);

  const handleCreateVariation = useCallback(async (data: {
    prompt: string;
    tags: string;
    lyrics: string;
    title: string;
    makeInstrumental: boolean;
  }) => {
    if (creatingVariation) return;
    if (initialVariationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setCreatingVariation(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: data.prompt || undefined,
          tags: data.tags || undefined,
          title: data.title || undefined,
          makeInstrumental: data.makeInstrumental,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error ?? "Failed to create variation", "error");
        return;
      }
      toast("Variation generation started!", "success");
      setVariationModalOpen(false);
      router.push(`/library/${result.song.id}`);
    } catch {
      toast("Failed to create variation", "error");
    } finally {
      setCreatingVariation(false);
    }
  }, [creatingVariation, initialVariationCount, maxVariations, song.id, toast, router]);

  const handleRemixSubmit = useCallback(async (
    action: RemixAction,
    data: Record<string, string | number | undefined>,
  ) => {
    if (remixSubmitting) return;
    if (initialVariationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setRemixSubmitting(true);
    try {
      const res = await fetch(`/api/songs/${song.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error ?? "Generation failed", "error");
        return;
      }
      toast("Generation started!", "success");
      setRemixAction(null);
      router.push(`/library/${result.song.id}`);
    } catch {
      toast("Generation failed", "error");
    } finally {
      setRemixSubmitting(false);
    }
  }, [remixSubmitting, initialVariationCount, maxVariations, song.id, toast, router]);

  // ── Export / format conversion ────────────────────────────────────────────
  const [exports, setExports] = useState<Record<ExportFormat, ExportState>>({
    wav: { status: "idle" },
    midi: { status: "idle" },
    mp4: { status: "idle" },
  });

  const [videoUrl, setVideoUrl] = useState<string | null>(song.videoUrl ?? null);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(song.videoUrl ? "ready" : "idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoPollRef = useRef<NodeJS.Timeout | null>(null);

  const startVideoPolling = useCallback((taskId: string) => {
    if (videoPollRef.current) clearInterval(videoPollRef.current);
    setVideoStatus("polling");
    setVideoError(null);

    const poll = async () => {
      try {
        const res = await fetch(`/api/songs/${song.id}/music-video/status?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();
        if (!res.ok) {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoStatus("error");
          setVideoError(data.error ?? "Failed to check video status");
          return;
        }
        if (data.status === "SUCCESS" && data.videoUrl) {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoUrl(data.videoUrl);
          setVideoStatus("ready");
          toast("Music video is ready!", "success");
        } else if (data.status === "CREATE_TASK_FAILED" || data.status === "GENERATE_MP4_FAILED" || data.status === "CALLBACK_EXCEPTION") {
          if (videoPollRef.current) clearInterval(videoPollRef.current);
          videoPollRef.current = null;
          setVideoStatus("error");
          setVideoError(data.errorMessage ?? "Video generation failed");
          toast("Music video generation failed", "error");
        }
      } catch {
        if (videoPollRef.current) clearInterval(videoPollRef.current);
        videoPollRef.current = null;
        setVideoStatus("error");
        setVideoError("Network error while checking video status");
      }
    };

    poll();
    videoPollRef.current = setInterval(poll, 7000);
  }, [song.id, toast]);

  useEffect(() => {
    return () => {
      if (videoPollRef.current) clearInterval(videoPollRef.current);
    };
  }, []);

  const handleExport = useCallback(async (format: ExportFormat) => {
    if (exports[format].status === "converting") return;
    setExports((prev) => ({ ...prev, [format]: { status: "converting" } }));

    const endpoints: Record<ExportFormat, string> = {
      wav: `/api/songs/${song.id}/convert-wav`,
      midi: `/api/songs/${song.id}/generate-midi`,
      mp4: `/api/songs/${song.id}/music-video`,
    };

    const labels: Record<ExportFormat, string> = {
      wav: "WAV conversion",
      midi: "MIDI extraction",
      mp4: "Music video generation",
    };

    try {
      const res = await fetch(endpoints[format], { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setExports((prev) => ({ ...prev, [format]: { status: "error", error: data.error } }));
        toast(data.error ?? `${labels[format]} failed`, "error");
        return;
      }
      setExports((prev) => ({ ...prev, [format]: { status: "done", taskId: data.taskId } }));
      if (format === "mp4" && data.taskId) {
        startVideoPolling(data.taskId);
      } else {
        toast(`${labels[format]} started! Task ID: ${data.taskId}`, "success");
      }
    } catch {
      setExports((prev) => ({ ...prev, [format]: { status: "error", error: `${labels[format]} failed` } }));
      toast(`${labels[format]} failed`, "error");
    }
  }, [exports, song.id, toast, startVideoPolling]);

  // ── Style template ────────────────────────────────────────────────────────
  const [saveStyleOpen, setSaveStyleOpen] = useState(false);
  const [styleTemplateName, setStyleTemplateName] = useState("");
  const [styleTemplateTags, setStyleTemplateTags] = useState("");
  const [isSavingStyle, setIsSavingStyle] = useState(false);

  const openSaveStyleModal = useCallback(() => {
    setStyleTemplateName("");
    setStyleTemplateTags((song.tags || "").trim());
    setSaveStyleOpen(true);
  }, [song.tags]);

  const handleSaveStyleTemplate = useCallback(async () => {
    if (isSavingStyle || !styleTemplateName.trim() || !styleTemplateTags.trim()) return;

    const name = styleTemplateName.trim();
    const tags = styleTemplateTags.trim();
    setIsSavingStyle(true);
    try {
      const res = await fetch("/api/style-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, tags, sourceSongId: song.id }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to save style template", "error");
        return;
      }

      setSaveStyleOpen(false);
      setStyleTemplateName("");
      setStyleTemplateTags("");
      toast("Style template saved", "success");
    } catch {
      toast("Failed to save style template", "error");
    } finally {
      setIsSavingStyle(false);
    }
  }, [isSavingStyle, styleTemplateName, styleTemplateTags, song.id, toast]);

  return {
    // Favorite
    isFavorite,
    favoriteCount,
    handleToggleFavorite,
    // Rating
    rating,
    saved,
    savingRating,
    noteDraft,
    setNoteDraft,
    setSaved,
    handleStarChange,
    handleSaveRating,
    // Thumbs
    thumbsRating,
    savingThumbs,
    handleThumbsFeedback,
    // Visibility
    isPublic,
    publicSlug,
    sharing,
    setVisibility,
    handleVisibilityToggle,
    handleCopyLink,
    handleShareOnX,
    // Archive
    isArchived,
    archiving,
    handleArchive,
    handleRestore,
    // Appeal
    appealOpen,
    setAppealOpen,
    appealReason,
    setAppealReason,
    appealSubmitting,
    appealStatus,
    handleSubmitAppeal,
    // Variations
    variationModalOpen,
    setVariationModalOpen,
    creatingVariation,
    compareVariation,
    setCompareVariation,
    remixAction,
    setRemixAction,
    remixSubmitting,
    handleCreateVariation,
    handleRemixSubmit,
    // Export
    exports,
    videoUrl,
    videoStatus,
    videoError,
    handleExport,
    // Style template
    saveStyleOpen,
    setSaveStyleOpen,
    styleTemplateName,
    setStyleTemplateName,
    styleTemplateTags,
    setStyleTemplateTags,
    isSavingStyle,
    openSaveStyleModal,
    handleSaveStyleTemplate,
  };
}
