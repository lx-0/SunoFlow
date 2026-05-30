"use client";

import { useState } from "react";
import { SparklesIcon } from "@heroicons/react/24/solid";
import { ChevronDownIcon } from "@heroicons/react/24/outline";
import { useToast } from "../Toast";
import { autoFillGenerationFields } from "./api";
import { Spinner } from "../Spinner";

interface AutoGeneratePanelProps {
  initialPrompt: string;
  onFieldsFilled: (fields: { title?: string; style?: string; lyricsPrompt?: string }) => void;
}

export function AutoGeneratePanel({ initialPrompt, onFieldsFilled }: AutoGeneratePanelProps) {
  const { toast } = useToast();
  const [showAutoGenerate, setShowAutoGenerate] = useState(false);
  const [autoPrompt, setAutoPrompt] = useState(initialPrompt);
  const [isAutoGenerating, setIsAutoGenerating] = useState(false);

  async function handleAutoGenerate() {
    if (isAutoGenerating || !autoPrompt.trim()) return;
    setIsAutoGenerating(true);
    try {
      const data = await autoFillGenerationFields(autoPrompt.trim());
      if (data.ok) {
        onFieldsFilled({
          title: data.title ?? undefined,
          style: data.style ?? undefined,
          lyricsPrompt: data.lyricsPrompt ?? undefined,
        });
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

  return (
    <div className="space-y-0 mb-4">
      <button
        type="button"
        onClick={() => setShowAutoGenerate((v) => !v)}
        aria-expanded={showAutoGenerate}
        className="w-full flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-300">
          <SparklesIcon className="h-4 w-4" />
          Auto-generate from description
        </span>
        <ChevronDownIcon
          className={`h-4 w-4 text-amber-500 dark:text-amber-400 transition-transform ${
            showAutoGenerate ? "rotate-180" : ""
          }`}
        />
      </button>

      {showAutoGenerate && (
        <div className="mt-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 space-y-3">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Describe what you want and we&apos;ll suggest a title, style, and prompt prompt all at once.
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={autoPrompt}
              onChange={(e) => setAutoPrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAutoGenerate(); } }}
              placeholder="e.g. a nostalgic road trip song, summer vibes, indie feel…"
              aria-label="Auto-generation description"
              maxLength={500}
              disabled={isAutoGenerating}
              className="flex-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl px-4 py-2.5 text-base sm:text-sm text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleAutoGenerate}
              disabled={isAutoGenerating || !autoPrompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-amber-600 hover:bg-amber-500 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap"
            >
              {isAutoGenerating ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Generating&hellip;
                </>
              ) : (
                <>
                  <SparklesIcon className="h-4 w-4" />
                  Fill fields
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
