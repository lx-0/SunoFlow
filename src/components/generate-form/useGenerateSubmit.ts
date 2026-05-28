import { useState } from "react";
import { fetchWithTimeout, clientFetchErrorMessage } from "@/lib/fetch-client";
import { track } from "@/lib/analytics";
import { getSubmitPrompt, getPromptValidationError } from "./helpers";
import { shouldShowUpgradeModal } from "../UpgradeModal";
import type { CreditInfo, PersonaOption, RateLimitStatus } from "./types";

type ToastFn = (
  message: string,
  variant: "success" | "error" | "info",
  action?: { label: string; onClick: () => void },
) => void;

interface UseGenerateSubmitParams {
  customMode: boolean;
  prompt: string;
  style: string;
  title: string;
  instrumental: boolean;
  selectedPersonaId: string;
  personas: PersonaOption[];
  sourceSongId: string | null;
  rateLimit: RateLimitStatus | null;
  setRateLimit: (rl: RateLimitStatus) => void;
  creditInfo: CreditInfo | null;
  trackSong: (songId: string, title: string | null) => void;
  fetchCredits: () => void;
  toast: ToastFn;
}

export function useGenerateSubmit({
  customMode,
  prompt,
  style,
  title,
  instrumental,
  selectedPersonaId,
  personas,
  sourceSongId,
  rateLimit,
  setRateLimit,
  creditInfo,
  trackSong,
  fetchCredits,
  toast,
}: UseGenerateSubmitParams) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [promptError, setPromptError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
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
  }

  return {
    isSubmitting,
    promptError,
    setPromptError,
    submitError,
    showUpgradeModal,
    setShowUpgradeModal,
    handleSubmit,
  };
}
