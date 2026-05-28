"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { getRating, type SongRating } from "@/lib/ratings";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";

type ToastFn = (message: string, variant?: "success" | "error" | "info") => void;

// ─── useSongFavorite ─────────────────────────────────────────────────────────

interface UseSongFavoriteOptions {
  songId: string;
  initialFavorite: boolean;
  initialCount: number;
  toast: ToastFn;
}

export function useSongFavorite({ songId, initialFavorite, initialCount, toast }: UseSongFavoriteOptions) {
  const [isFavorite, setIsFavorite] = useState(initialFavorite);
  const [favoriteCount, setFavoriteCount] = useState(initialCount);

  const toggle = useCallback(async () => {
    const prev = isFavorite;
    const prevCount = favoriteCount;
    const newFav = !prev;
    setIsFavorite(newFav);
    setFavoriteCount(newFav ? prevCount + 1 : Math.max(0, prevCount - 1));
    try {
      const res = await fetch(`/api/songs/${songId}/favorite`, {
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
  }, [songId, isFavorite, favoriteCount, toast]);

  return { isFavorite, favoriteCount, toggle };
}

// ─── useSongRating ───────────────────────────────────────────────────────────

interface UseSongRatingOptions {
  songId: string;
  initialRating: number | null;
  initialNote: string | null;
  toast: ToastFn;
}

export function useSongRating({ songId, initialRating, initialNote, toast }: UseSongRatingOptions) {
  const [rating, setRatingState] = useState<SongRating>({
    stars: initialRating ?? 0,
    note: initialNote ?? "",
  });
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [noteDraft, setNoteDraft] = useState(initialNote ?? "");

  useEffect(() => {
    if (initialRating) return;
    let cancelled = false;
    getRating(songId).then((existing) => {
      if (cancelled || !existing) return;
      setRatingState(existing);
      setNoteDraft(existing.note);
    });
    return () => { cancelled = true; };
  }, [songId, initialRating]);

  const setStars = useCallback((stars: number) => {
    setRatingState((r) => ({ ...r, stars }));
    setSaved(false);
  }, []);

  const save = useCallback(async () => {
    if (rating.stars === 0 || saving) return;
    const r: SongRating = { stars: rating.stars, note: noteDraft.trim() };
    setSaving(true);
    try {
      const res = await fetch(`/api/songs/${songId}/rating`, {
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
      setSaving(false);
    }
  }, [songId, rating.stars, noteDraft, saving, toast]);

  return { rating, saved, saving, noteDraft, setNoteDraft, setStars, save, setSaved };
}

// ─── useSongThumbsFeedback ───────────────────────────────────────────────────

type ThumbsRating = "thumbs_up" | "thumbs_down" | null;

interface UseSongThumbsFeedbackOptions {
  songId: string;
  toast: ToastFn;
}

export function useSongThumbsFeedback({ songId, toast }: UseSongThumbsFeedbackOptions) {
  const [thumbsRating, setThumbsRating] = useState<ThumbsRating>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/songs/${songId}/feedback`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (cancelled || !data?.rating) return;
        setThumbsRating(data.rating);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [songId]);

  const submit = useCallback(async (value: "thumbs_up" | "thumbs_down") => {
    if (saving) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/songs/${songId}/feedback`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating: value }),
      });
      if (res.ok) setThumbsRating(value);
    } catch {
      toast("Failed to save feedback", "error");
    } finally {
      setSaving(false);
    }
  }, [songId, saving, toast]);

  return { thumbsRating, saving, submit };
}

// ─── useSongVisibility ───────────────────────────────────────────────────────

interface UseSongVisibilityOptions {
  songId: string;
  songTitle: string | null;
  initialIsPublic: boolean;
  initialSlug: string | null;
  toast: ToastFn;
}

export function useSongVisibility({ songId, songTitle, initialIsPublic, initialSlug, toast }: UseSongVisibilityOptions) {
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [publicSlug, setPublicSlug] = useState(initialSlug);
  const [sharing, setSharing] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const setVisibility = useCallback(async (visibility: "public" | "private") => {
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
  }, [songId, toast]);

  const toggle = useCallback(() => {
    if (!isPublic) {
      setConfirmOpen(true);
    } else {
      setVisibility("private");
    }
  }, [isPublic, setVisibility]);

  const confirmPublic = useCallback(() => {
    setConfirmOpen(false);
    setVisibility("public");
  }, [setVisibility]);

  const copyLink = useCallback(async () => {
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
  }, [songId, songTitle, publicSlug, toast]);

  const shareOnX = useCallback(() => {
    if (!publicSlug) return;
    const url = `${window.location.origin}/s/${publicSlug}`;
    const title = songTitle ?? "Check out this song";
    const tweetText = `${title} — listen on SunoFlow`;
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}&url=${encodeURIComponent(url)}`;
    window.open(twitterUrl, "_blank", "noopener,noreferrer");
    track("song_shared", { songId, source: "song_detail", method: "twitter" });
  }, [songId, songTitle, publicSlug]);

  return { isPublic, publicSlug, sharing, confirmOpen, setConfirmOpen, toggle, confirmPublic, copyLink, shareOnX };
}

// ─── useSongArchive ──────────────────────────────────────────────────────────

interface UseSongArchiveOptions {
  songId: string;
  initialIsArchived: boolean;
  toast: ToastFn;
  onArchived: () => void;
}

export function useSongArchive({ songId, initialIsArchived, toast, onArchived }: UseSongArchiveOptions) {
  const [isArchived, setIsArchived] = useState(initialIsArchived);
  const [archiving, setArchiving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const archive = useCallback(async () => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${songId}/archive`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to archive song", "error");
        return;
      }
      setIsArchived(true);
      toast("Song archived", "success");
      onArchived();
    } catch {
      toast("Failed to archive song", "error");
    } finally {
      setArchiving(false);
    }
  }, [songId, toast, onArchived]);

  const restore = useCallback(async () => {
    setArchiving(true);
    try {
      const res = await fetch(`/api/songs/${songId}/restore`, { method: "POST" });
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
  }, [songId, toast]);

  const confirmAndArchive = useCallback(() => {
    setConfirmOpen(false);
    archive();
  }, [archive]);

  return { isArchived, archiving, confirmOpen, setConfirmOpen, archive: confirmAndArchive, restore };
}

// ─── useSongAppeal ───────────────────────────────────────────────────────────

interface UseSongAppealOptions {
  songId: string;
  toast: ToastFn;
}

export function useSongAppeal({ songId, toast }: UseSongAppealOptions) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<"none" | "pending" | "approved" | "rejected">("none");
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(dialogRef, open, () => setOpen(false));

  const submit = useCallback(async () => {
    if (reason.trim().length < 10) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/appeals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ songId, reason: reason.trim() }),
      });
      if (res.status === 409) {
        setStatus("pending");
        setOpen(false);
        toast("You already have a pending appeal for this song.");
        return;
      }
      if (res.ok) {
        setStatus("pending");
        setOpen(false);
        toast("Appeal submitted. We'll review it shortly.");
      } else {
        const data = await res.json().catch(() => ({}));
        toast(data.error || "Failed to submit appeal. Please try again.");
      }
    } catch {
      toast("Failed to submit appeal. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [songId, reason, toast]);

  return { open, setOpen, reason, setReason, submitting, status, dialogRef, submit };
}

// ─── useSongExport ───────────────────────────────────────────────────────────

type ExportFormat = "wav" | "midi" | "mp4";
type ExportStatus = "idle" | "converting" | "done" | "error";
type VideoStatus = "idle" | "polling" | "ready" | "error";

interface UseSongExportOptions {
  songId: string;
  initialVideoUrl: string | null;
  toast: ToastFn;
}

export function useSongExport({ songId, initialVideoUrl, toast }: UseSongExportOptions) {
  const [exports, setExports] = useState<Record<ExportFormat, { status: ExportStatus; taskId?: string; error?: string }>>({
    wav: { status: "idle" },
    midi: { status: "idle" },
    mp4: { status: "idle" },
  });
  const [videoUrl, setVideoUrl] = useState<string | null>(initialVideoUrl);
  const [videoStatus, setVideoStatus] = useState<VideoStatus>(initialVideoUrl ? "ready" : "idle");
  const [videoError, setVideoError] = useState<string | null>(null);
  const videoPollRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (videoPollRef.current) clearInterval(videoPollRef.current);
    };
  }, []);

  const startVideoPolling = useCallback((taskId: string) => {
    if (videoPollRef.current) clearInterval(videoPollRef.current);
    setVideoStatus("polling");
    setVideoError(null);

    const poll = async () => {
      try {
        const res = await fetch(`/api/songs/${songId}/music-video/status?taskId=${encodeURIComponent(taskId)}`);
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
  }, [songId, toast]);

  const exportFormat = useCallback(async (format: ExportFormat) => {
    if (exports[format].status === "converting") return;
    setExports((prev) => ({ ...prev, [format]: { status: "converting" } }));

    const endpoints: Record<ExportFormat, string> = {
      wav: `/api/songs/${songId}/convert-wav`,
      midi: `/api/songs/${songId}/generate-midi`,
      mp4: `/api/songs/${songId}/music-video`,
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
  }, [songId, exports, toast, startVideoPolling]);

  return { exports, videoUrl, videoStatus, videoError, exportFormat };
}

// ─── useSongStyleTemplate ────────────────────────────────────────────────────

interface UseSongStyleTemplateOptions {
  songId: string;
  songTags: string | null;
  toast: ToastFn;
}

export function useSongStyleTemplate({ songId, songTags, toast }: UseSongStyleTemplateOptions) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [tags, setTags] = useState("");
  const [saving, setSaving] = useState(false);

  const openModal = useCallback(() => {
    setName("");
    setTags((songTags || "").trim());
    setOpen(true);
  }, [songTags]);

  const save = useCallback(async () => {
    if (saving || !name.trim() || !tags.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/style-templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), tags: tags.trim(), sourceSongId: songId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast(data.error ?? "Failed to save style template", "error");
        return;
      }
      setOpen(false);
      setName("");
      setTags("");
      toast("Style template saved", "success");
    } catch {
      toast("Failed to save style template", "error");
    } finally {
      setSaving(false);
    }
  }, [songId, name, tags, saving, toast]);

  return { open, setOpen, name, setName, tags, setTags, saving, openModal, save };
}

// ─── useSongVariation ────────────────────────────────────────────────────────

interface UseSongVariationOptions {
  songId: string;
  variationCount: number;
  maxVariations: number;
  toast: ToastFn;
  onCreated: (newSongId: string) => void;
}

export function useSongVariation({ songId, variationCount, maxVariations, toast, onCreated }: UseSongVariationOptions) {
  const [modalOpen, setModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const create = useCallback(async (data: { prompt: string; tags: string; lyrics: string; title: string; makeInstrumental: boolean }) => {
    if (creating) return;
    if (variationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setCreating(true);
    try {
      const res = await fetch(`/api/songs/${songId}/variations`, {
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
      setModalOpen(false);
      onCreated(result.song.id);
    } catch {
      toast("Failed to create variation", "error");
    } finally {
      setCreating(false);
    }
  }, [songId, creating, variationCount, maxVariations, toast, onCreated]);

  const openModal = useCallback(() => {
    if (variationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setModalOpen(true);
  }, [variationCount, maxVariations, toast]);

  return { modalOpen, setModalOpen, creating, create, openModal };
}

// ─── useSongRemix ────────────────────────────────────────────────────────────

export type RemixActionType = "extend" | "add-vocals" | "add-instrumental" | "replace-section";

interface UseSongRemixOptions {
  songId: string;
  variationCount: number;
  maxVariations: number;
  toast: ToastFn;
  onCreated: (newSongId: string) => void;
}

export function useSongRemix({ songId, variationCount, maxVariations, toast, onCreated }: UseSongRemixOptions) {
  const [action, setAction] = useState<RemixActionType | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const submit = useCallback(async (remixAction: RemixActionType, data: Record<string, string | number | undefined>) => {
    if (submitting) return;
    if (variationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/songs/${songId}/${remixAction}`, {
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
      setAction(null);
      onCreated(result.song.id);
    } catch {
      toast("Generation failed", "error");
    } finally {
      setSubmitting(false);
    }
  }, [songId, submitting, variationCount, maxVariations, toast, onCreated]);

  return { action, setAction, submitting, submit };
}
