"use client";

import { useState, useCallback } from "react";
import { useToast } from "@/components/Toast";
import { apiPost } from "@/lib/api-client";

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
        await apiPost("/api/presets", {
          name,
          stylePrompt: entry.prompt,
          isInstrumental: entry.isInstrumental,
        });
        toast("Prompt saved to library!", "success");
      } catch (err) {
        const msg = err instanceof Error ? err.message : undefined;
        toast(msg && !msg.startsWith("HTTP") ? msg : "Could not save prompt.", "error");
      } finally {
        setSavingPromptId(null);
      }
    },
    [savingPromptId, toast],
  );

  return { savingPromptId, handleSavePrompt };
}
