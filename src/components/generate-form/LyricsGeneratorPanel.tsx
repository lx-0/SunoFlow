"use client";

import { useState } from "react";
import { Sparkles, SquarePen, ChevronDown } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useToast } from "../Toast";
import { generateLyricsFromPrompt } from "./api";
import { Spinner } from "../Spinner";

interface LyricsGeneratorPanelProps {
  initialPrompt: string;
  onUseLyrics: (lyrics: string) => void;
  // The generator also returns a title + music style derived from the source
  // text — let the form drop each into its own field.
  onApplyMeta?: (meta: { title?: string; style?: string }) => void;
}

export function LyricsGeneratorPanel({ initialPrompt, onUseLyrics, onApplyMeta }: LyricsGeneratorPanelProps) {
  const { toast } = useToast();
  const [showLyricsGenerator, setShowLyricsGenerator] = useState(Boolean(initialPrompt));
  const [lyricsPrompt, setLyricsPrompt] = useState(initialPrompt);
  const [generatedLyrics, setGeneratedLyrics] = useState("");
  const [isGeneratingLyrics, setIsGeneratingLyrics] = useState(false);

  async function handleGenerateLyrics() {
    if (isGeneratingLyrics || !lyricsPrompt.trim()) return;
    setIsGeneratingLyrics(true);
    try {
      const data = await generateLyricsFromPrompt(lyricsPrompt.trim());
      if (data.ok && data.lyrics) {
        setGeneratedLyrics(data.lyrics);
        onApplyMeta?.({ title: data.title, style: data.style });
        toast("Lyrics generated!", "success");
      } else {
        toast(data.error ?? "Lyrics generation failed", "error");
      }
    } catch {
      toast("Lyrics generation failed", "error");
    } finally {
      setIsGeneratingLyrics(false);
    }
  }

  function handleUseLyrics() {
    if (!generatedLyrics.trim()) return;
    onUseLyrics(generatedLyrics);
    toast("Lyrics applied!", "success");
  }

  return (
    <div className="space-y-0">
      <button
        type="button"
        onClick={() => setShowLyricsGenerator((v) => !v)}
        aria-expanded={showLyricsGenerator}
        className="w-full flex items-center justify-between bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 rounded-xl px-4 py-3 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
      >
        <span className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
          <Icon icon={SquarePen} className="h-4 w-4" />
          Generate Lyrics
        </span>
        <Icon icon={ChevronDown}
          className={`h-4 w-4 text-violet-500 dark:text-violet-400 transition-transform ${
            showLyricsGenerator ? "rotate-180" : ""
          }`}
        />
      </button>

      {showLyricsGenerator && (
        <div className="mt-3 bg-surface-raised border border-border rounded-xl p-4 space-y-3">
          <div className="flex gap-2">
            <textarea
              value={lyricsPrompt}
              onChange={(e) => setLyricsPrompt(e.target.value)}
              placeholder="Describe your song theme, mood, or topic..."
              aria-label="Lyrics generation prompt"
              maxLength={6000}
              rows={3}
              disabled={isGeneratingLyrics}
              className="flex-1 bg-surface-raised border border-border rounded-xl px-4 py-2.5 text-base sm:text-sm text-primary placeholder-muted focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent disabled:opacity-50 resize-none"
            />
            <button
              type="button"
              onClick={handleGenerateLyrics}
              disabled={isGeneratingLyrics || !lyricsPrompt.trim()}
              className="flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-500 disabled:opacity-50 rounded-xl transition-colors whitespace-nowrap"
            >
              {isGeneratingLyrics ? (
                <>
                  <Spinner className="h-4 w-4" />
                  Generating&hellip;
                </>
              ) : (
                <>
                  <Icon icon={Sparkles} fill="currentColor" className="h-4 w-4" />
                  Generate
                </>
              )}
            </button>
          </div>

          {generatedLyrics && (
            <div className="space-y-2">
              <textarea
                value={generatedLyrics}
                onChange={(e) => setGeneratedLyrics(e.target.value)}
                aria-label="Generated lyrics"
                rows={8}
                className="w-full bg-surface border border-border rounded-xl px-4 py-3 text-base sm:text-sm text-primary focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent resize-none"
              />
              <button
                type="button"
                onClick={handleUseLyrics}
                className="w-full px-4 py-2.5 text-sm font-medium text-violet-700 dark:text-violet-300 bg-violet-100 dark:bg-violet-900/30 border border-violet-300 dark:border-violet-700 rounded-xl hover:bg-violet-200 dark:hover:bg-violet-900/50 transition-colors"
              >
                Use these prompt
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
