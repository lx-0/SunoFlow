"use client";

import { useState } from "react";
import { boostStylePrompt } from "@/components/generate-form/api";

interface UseStyleBoostOptions {
  style: string;
  onStyleChange: (style: string) => void;
  toast: (message: string, type: "success" | "error") => void;
}

export function useStyleBoost({ style, onStyleChange, toast }: UseStyleBoostOptions) {
  const [isBoosting, setIsBoosting] = useState(false);

  async function handleBoostStyle() {
    if (isBoosting || !style.trim()) return;
    setIsBoosting(true);
    try {
      const data = await boostStylePrompt(style.trim());
      if (data.ok && data.result) {
        onStyleChange(data.result);
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

  return { isBoosting, handleBoostStyle };
}
