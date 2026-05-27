"use client";

import { useState, useCallback } from "react";
import { fetchWithTimeout, clientFetchErrorMessage } from "@/lib/fetch-client";
import { track } from "@/lib/analytics";
import { shouldShowUpgradeModal } from "../UpgradeModal";
import {
  getPromptValidationError,
  getSubmitPrompt,
  getPendingIndexFromVisualIndex,
  reorderPendingQueueIds,
} from "./helpers";
import type { CreditInfo, PersonaOption, RateLimitStatus } from "./types";

interface UseGenerateSubmitParams {
  toast: (msg: string, type?: "success" | "error" | "info", opts?: { label: string; onClick: () => void }) => void;
  customMode: boolean;
  prompt: string;
  style: string;
  title: string;
  instrumental: boolean;
  selectedPersonaId: string;
  sourceSongId: string | null;
  creditInfo: CreditInfo | null;
  personas: PersonaOption[];
  rateLimit: RateLimitStatus | null;
  setRateLimit: (rl: RateLimitStatus) => void;
  trackSong: (id: string, title: string | null) => void;
  fetchCredits: () => void;
  queueItems: Array<{ id: string; status: string }>;
  addToQueue: (item: {
    prompt: string;
    title?: string;
    tags?: string;
    makeInstrumental: boolean;
    personaId?: string;
  }) => Promise<{ item?: { id: string }; error?: string }>;
  reorderQueue: (ids: string[]) => void;
  processNext: () => Promise<{ song?: { id: string; title: string | null } }>;
  queueIsProcessing: boolean;
}

export function useGenerateSubmit({
  toast,
  customMode,
  prompt,
  style,
  title,
  instrumental,
  selectedPersonaId,
  sourceSongId,
  creditInfo,
  personas,
  rateLimit,
  setRateLimit,
  trackSong,
  fetchCredits,
  queueItems,
  addToQueue,
  reorderQueue,
  processNext,
  queueIsProcessing,
}: UseGenerateSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (isSubmitting) return;
      setSubmitError(null);

      const submitPromptValue = getSubmitPrompt(customMode, prompt, style);
      const promptValidationError = getPromptValidationError(submitPromptValue, customMode);
      if (promptValidationError) {
        setPromptError(promptValidationError);
        return;
      }
      setPromptError(null);

      if (creditInfo !== null && creditInfo.creditsRemaining <= 0 && shouldShowUpgradeModal("no_credits")) {
        setShowUpgradeModal(true);
        return;
      }

      setIsSubmitting(true);

      try {
        const selectedPersona = personas.find((p) => p.personaId === selectedPersonaId);
        const body = {
          prompt: customMode ? prompt : style,
          title: title || undefined,
          tags: style || undefined,
          makeInstrumental: instrumental,
          personaId: selectedPersona?.personaId || undefined,
          parentSongId: sourceSongId || undefined,
        };

        let res: Response;
        try {
          res = await fetchWithTimeout("/api/generate", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
          });
        } catch (fetchErr) {
          const msg = clientFetchErrorMessage(fetchErr);
          setSubmitError(msg);
          toast(msg, "error", { label: "Retry", onClick: () => handleSubmit(e) });
          return;
        }

        const data = await res.json();

        if (!res.ok) {
          if (res.status === 429 && (data.details?.resetAt || data.details?.rateLimit?.resetAt)) {
            const resetAt = data.details?.resetAt ?? data.details?.rateLimit?.resetAt;
            const resetTime = new Date(resetAt);
            const minutesLeft = Math.ceil((resetTime.getTime() - Date.now()) / 60000);
            const message = `Rate limit reached. Try again in ${minutesLeft} minute${minutesLeft === 1 ? "" : "s"}.`;
            setSubmitError(message);
            toast(message, "error");
            if (data.details?.rateLimit) setRateLimit(data.details.rateLimit);
          } else if (res.status >= 500) {
            const message = data.error ?? "Generation failed. Please try again.";
            setSubmitError(message);
            toast(message, "error", {
              label: "Retry",
              onClick: () => handleSubmit(e),
            });
          } else {
            const message = data.error ?? "Generation failed. Please try again.";
            setSubmitError(message);
            toast(message, "error");
          }
          return;
        }

        if (data.rateLimit) {
          setRateLimit(data.rateLimit);
          if (data.rateLimit.remaining <= 2 && data.rateLimit.remaining > 0) {
            toast(`${data.rateLimit.remaining} generation${data.rateLimit.remaining === 1 ? "" : "s"} remaining this hour`, "info");
          }
        }

        const song = data.songs?.[0] ?? data.song;
        const songId = song?.id ?? data.id;
        const songTitle = song?.title ?? data.title ?? (title || null);

        if (data.error) {
          setSubmitError(data.error);
          toast(data.error, "error");
          return;
        }

        setSubmitError(null);
        toast("Song generation started!", "success");
        track("song_generation_requested", { mode: customMode ? "custom" : "style", instrumental });
        trackSong(songId, songTitle);
        fetchCredits();
      } catch {
        const message = "Network error. Please check your connection and try again.";
        setSubmitError(message);
        toast(message, "error", {
          label: "Retry",
          onClick: () => handleSubmit(e),
        });
      } finally {
        setIsSubmitting(false);
      }
    },
    [isSubmitting, customMode, prompt, style, title, instrumental, selectedPersonaId, sourceSongId, creditInfo, personas, setRateLimit, trackSong, fetchCredits, toast],
  );

  const handleAddToQueue = useCallback(async () => {
    const submitPrompt = getSubmitPrompt(customMode, prompt, style);
    if (!submitPrompt) {
      toast("A prompt is required", "error");
      return;
    }

    const selectedPersona = personas.find((p) => p.personaId === selectedPersonaId);
    const { item, error: queueError } = await addToQueue({
      prompt: submitPrompt.trim(),
      title: title || undefined,
      tags: style || undefined,
      makeInstrumental: instrumental,
      personaId: selectedPersona?.personaId || undefined,
    });

    if (queueError) {
      toast(queueError, "error");
      return;
    }

    toast("Added to generation queue!", "success");
    track("song_generation_requested", { mode: customMode ? "custom" : "style", instrumental, via: "queue" });

    if (!queueIsProcessing && item) {
      const result = await processNext();
      if (result?.song) {
        trackSong(result.song.id, result.song.title);
        fetchCredits();
      }
    }
  }, [customMode, prompt, style, title, instrumental, selectedPersonaId, personas, addToQueue, queueIsProcessing, processNext, trackSong, fetchCredits, toast]);

  const handleQueueMoveUp = useCallback(
    (index: number) => {
      const activeItems = queueItems.filter(
        (i) => i.status === "pending" || i.status === "processing",
      );
      const pendingItems = activeItems.filter((i) => i.status === "pending");
      if (index <= 0) return;
      const firstActiveStatus =
        activeItems[0]?.status === "processing"
          ? "processing"
          : activeItems[0]?.status === "pending"
            ? "pending"
            : undefined;
      const pendingIndex = getPendingIndexFromVisualIndex(index, firstActiveStatus as "processing" | "pending" | undefined);
      const ids = reorderPendingQueueIds(
        pendingItems.map((i) => i.id),
        pendingIndex,
        "up",
      );
      reorderQueue(ids);
    },
    [queueItems, reorderQueue],
  );

  const handleQueueMoveDown = useCallback(
    (index: number) => {
      const activeItems = queueItems.filter(
        (i) => i.status === "pending" || i.status === "processing",
      );
      const pendingItems = activeItems.filter((i) => i.status === "pending");
      const firstActiveStatus =
        activeItems[0]?.status === "processing"
          ? "processing"
          : activeItems[0]?.status === "pending"
            ? "pending"
            : undefined;
      const pendingIndex = getPendingIndexFromVisualIndex(index, firstActiveStatus as "processing" | "pending" | undefined);
      const ids = reorderPendingQueueIds(
        pendingItems.map((i) => i.id),
        pendingIndex,
        "down",
      );
      reorderQueue(ids);
    },
    [queueItems, reorderQueue],
  );

  return {
    isSubmitting,
    promptError,
    setPromptError,
    submitError,
    showUpgradeModal,
    setShowUpgradeModal,
    handleSubmit,
    handleAddToQueue,
    handleQueueMoveUp,
    handleQueueMoveDown,
  };
}
