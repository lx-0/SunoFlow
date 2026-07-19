"use client";

import type { PromptSuggestion, TrendingStyleCombo } from "./types";

interface SuggestionsPanelProps {
  suggestions: PromptSuggestion[];
  trendingCombos: TrendingStyleCombo[];
  onApplySuggestion: (suggestion: PromptSuggestion) => void;
  onApplyTrendingCombo: (stylePrompt: string) => void;
}

export function SuggestionsPanel({
  suggestions,
  trendingCombos,
  onApplySuggestion,
  onApplyTrendingCombo,
}: SuggestionsPanelProps) {
  if (suggestions.length === 0 && trendingCombos.length === 0) return null;

  return (
    <>
      {/* Suggested for you */}
      {suggestions.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Suggested for you
          </p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onApplySuggestion(s)}
                title={s.stylePrompt}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-surface-raised text-primary border border-border rounded-full hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-50 dark:hover:bg-violet-900/10 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
              >
                {s.source === "personal" && (
                  <span className="text-amber-500" aria-hidden="true">&#9733;</span>
                )}
                {s.label}
                {s.isInstrumental && (
                  <span className="text-[10px] font-medium px-1 py-0.5 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 ml-0.5">
                    Instr
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Trending combos */}
      {trendingCombos.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-secondary uppercase tracking-wide">
            Trending Combos
          </p>
          <div className="flex flex-wrap gap-2">
            {trendingCombos.map((combo) => (
              <button
                key={combo.id}
                type="button"
                onClick={() => onApplyTrendingCombo(combo.stylePrompt)}
                title={`${combo.combo} — rated ${combo.displayScore}`}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-violet-50 dark:bg-violet-900/20 text-violet-700 dark:text-violet-300 border border-violet-200 dark:border-violet-800 rounded-full hover:border-violet-400 dark:hover:border-violet-500 hover:bg-violet-100 dark:hover:bg-violet-900/30 transition-colors"
              >
                <span aria-hidden="true">&#128293;</span>
                {combo.label}
                <span className="text-[10px] font-semibold text-violet-500 dark:text-violet-400 ml-0.5">
                  {combo.displayScore}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
