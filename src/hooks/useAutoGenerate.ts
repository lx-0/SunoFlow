"use client";

import { useState } from "react";
import { autoFillGenerationFields } from "@/components/generate-form/api";

interface UseAutoGenerateOptions {
  initialPrompt: string;
  toast: (message: string, type: "success" | "error") => void;
  onResult: (result: { title?: string; style?: string; lyricsPrompt?: string }) => void;
}

export function useAutoGenerate({ initialPrompt, toast, onResult }: UseAutoGenerateOptions) {
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoPrompt, setAutoPrompt] = useState(initialPrompt);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  async function handleAutoGenerate() {
    if (isAutoGenerating || !autoPrompt.trim()) return;
    setIsAutoGenerating(true);
    try {
      const data = await autoFillGenerationFields(autoPrompt.trim());
      if (data.ok) {
        onResult({ title: data.title, style: data.style, lyricsPrompt: data.lyricsPrompt });
        toast("Fields filled! Generate lyrics next.", "success");
      } else {
        toast(data.error ?? "Auto-generation failed", "error");
      }
    } catch {
      toast("Auto-generation failed", "error");
    } finally {
      setIsAutoGenerating(false);
    }
  }

  return {
    showAutoGenerate,
    setShowAutoGenerate,
    autoPrompt,
    setAutoPrompt,
    isAutoGenerating,
    handleAutoGenerate,
  };
}
