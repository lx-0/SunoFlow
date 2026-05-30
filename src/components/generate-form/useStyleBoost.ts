import { useState } from "react";
import { boostStylePrompt } from "./api";
import type { PromptSuggestion } from "./types";
import { type ToastFn } from "@/components/Toast";


interface UseStyleBoostParams {
  style: string;
  setStyle: (style: string) => void;
  setInstrumental: (instrumental: boolean) => void;
  setCustomMode: (customMode: boolean) => void;
  toast: ToastFn;
}

export function useStyleBoost({
  style,
  setStyle,
  setInstrumental,
  setCustomMode,
  toast,
}: UseStyleBoostParams) {
  const [isBoosting, setIsBoosting] = useState(false);

  async function handleBoostStyle() {
    if (isBoosting || !style.trim()) return;
    setIsBoosting(true);
    try {
      const data = await boostStylePrompt(style.trim());
      if (data.ok && data.result) {
        setStyle(data.result);
        toast("Style enhanced!", "success");
      } else {
        toast(data.error ?? "Style boost failed", "error");
      }
    } catch {
      toast("Style boost failed", "error");
    } finally {
      setIsBoosting(false);
    }
  }

  function applySuggestion(suggestion: PromptSuggestion) {
    setStyle(suggestion.stylePrompt);
    setInstrumental(suggestion.isInstrumental);
    setCustomMode(false);
    toast("Applied suggestion", "success");
  }

  return {
    isBoosting,
    handleBoostStyle,
    applySuggestion,
  };
}
