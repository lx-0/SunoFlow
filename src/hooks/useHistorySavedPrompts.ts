"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/Toast";

interface PromptEntry {
  id: string;
  title: string | null;
  prompt: string | null;
  isInstrumental: boolean;
}

export function useHistorySavedPrompts() {
  const { toast } = useToast();
  const [savingPromptId, setSavingPromptId] = useState<string | null>(null);

  const handleSavePrompt = useCallback(
    async (entry: PromptEntry) => {
      if (savingPromptId || !entry.prompt) return;
      setSavingPromptId(entry.id);
      try {
        const name =
          entry.title || entry.prompt.slice(0, 40) + (entry.prompt.length > 40 ? "…" : "");
        const res = await fetch("/api/presets", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            stylePrompt: entry.prompt,
            isInstrumental: entry.isInstrumental,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          toast(data.error ?? "Could not save prompt.", "error");
          return;
        }
        toast("Prompt saved to library!", "success");
      } catch {
        toast("Network error saving prompt.", "error");
      } finally {
        setSavingPromptId(null);
      }
    },
    [savingPromptId, toast],
  );

  return { savingPromptId, handleSavePrompt };
}
