"use client";

import { useState } from "react";
import { ModalShell } from "./ModalShell";

interface SeparateVocalsModalProps {
  onClose: () => void;
  onSubmit: (type: "separate_vocal" | "split_stem") => void;
  submitting: boolean;
}

export function SeparateVocalsModal({ onClose, onSubmit, submitting }: SeparateVocalsModalProps) {
  const [mode, setMode] = useState<"separate_vocal" | "split_stem">("separate_vocal");

  return (
    <ModalShell title="Separate Vocals" onClose={onClose}>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Split this track into separate vocal and instrumental stems.
        </p>

        <div className="space-y-2">
          <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Quality mode</label>
          <button
            onClick={() => setMode("separate_vocal")}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
              mode === "separate_vocal"
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
            }`}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white block">Standard</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Vocals + Instrumental &middot; 10 credits</span>
          </button>
          <button
            onClick={() => setMode("split_stem")}
            className={`w-full text-left px-4 py-3 rounded-xl border transition-colors ${
              mode === "split_stem"
                ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                : "border-gray-200 dark:border-gray-700 hover:border-violet-300 dark:hover:border-violet-600"
            }`}
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white block">High Quality</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">Full stem separation &middot; 50 credits</span>
          </button>
        </div>

        <button
          onClick={() => onSubmit(mode)}
          disabled={submitting}
          className="w-full px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-xl transition-colors min-h-[44px]"
        >
          {submitting ? "Separating..." : `Separate (${mode === "split_stem" ? "50" : "10"} credits)`}
        </button>
    </ModalShell>
  );
}
