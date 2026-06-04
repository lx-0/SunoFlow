"use client";

import { useState, useCallback, useMemo } from "react";
import { pickReactionEmojis } from "@sunoflow/core";

interface EmojiReactionPickerProps {
  isPlaying: boolean;
  isAuthenticated: boolean;
  onReact: (emoji: string) => void;
  /** Existing reaction emojis for the current song, used to derive "top used" */
  reactionEmojis?: string[];
}

export function EmojiReactionPicker({
  isPlaying,
  isAuthenticated,
  onReact,
  reactionEmojis = [],
}: EmojiReactionPickerProps) {
  const [animating, setAnimating] = useState<string | null>(null);
  const [debounced, setDebounced] = useState<Set<string>>(new Set());

  // Displayed emojis (top-used + random) come from @sunoflow/core so web + mobile
  // share the exact same set + rule. Keyed on length so it re-shuffles on change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const displayEmojis = useMemo(() => pickReactionEmojis(reactionEmojis), [reactionEmojis.length]);

  const handleClick = useCallback(
    (emoji: string) => {
      if (debounced.has(emoji)) return;

      onReact(emoji);

      // Animate
      setAnimating(emoji);
      setTimeout(() => setAnimating(null), 400);

      // Debounce
      setDebounced((prev) => new Set(prev).add(emoji));
      setTimeout(() => {
        setDebounced((prev) => {
          const next = new Set(prev);
          next.delete(emoji);
          return next;
        });
      }, 400);
    },
    [debounced, onReact]
  );

  if (!isPlaying || !isAuthenticated) return null;

  return (
    <div
      role="toolbar"
      aria-label="Emoji reactions"
      className="flex items-center gap-1 rounded-full bg-black/60 px-2 py-1 backdrop-blur-sm"
    >
      {displayEmojis.map((emoji) => {
        const isAnimating = animating === emoji;
        const isDisabled = debounced.has(emoji);
        return (
          <button
            key={emoji}
            onClick={() => handleClick(emoji)}
            disabled={isDisabled}
            aria-label={`React with ${emoji}`}
            className={[
              "flex h-8 w-8 items-center justify-center rounded-full text-lg transition-all",
              "hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
              "disabled:cursor-not-allowed disabled:opacity-40",
              isAnimating ? "scale-125 opacity-0" : "scale-100 opacity-100",
            ].join(" ")}
            style={{ transitionDuration: isAnimating ? "400ms" : "150ms" }}
          >
            {emoji}
          </button>
        );
      })}
    </div>
  );
}
