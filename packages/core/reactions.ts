// Emoji reaction logic shared by the web player (EmojiReactionPicker) and the
// mobile player (ReactionPicker). Pure + framework-agnostic so both runtimes use
// the SAME emoji set and the SAME "what to show" rule — single source of truth.

export const EMOJI_REACTIONS = [
  "🔥", "🤯", "😭", "🥵", "💀", "🫶", "👑", "🎸", "😤", "🚀", "💥", "✨",
  "🎵", "🎶", "💜", "🙌", "😍", "🫠", "🤩", "😮‍💨", "🥹", "💫", "🌊", "⚡",
  "🎤", "🪩", "🤘", "💃", "🕺", "🧠", "👏", "😈", "🦋", "🌟", "❤️‍🔥", "🫡",
];

export const REACTION_DISPLAY_COUNT = 6;
export const REACTION_TOP_USED_COUNT = 4;

/** Fisher-Yates shuffle (non-mutating). `rand` is injectable for deterministic tests. */
export function shuffleEmojis<T>(arr: T[], rand: () => number = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * The emojis to surface in the picker: the most-used ones for this song (by
 * frequency, capped at REACTION_TOP_USED_COUNT) padded out to
 * REACTION_DISPLAY_COUNT with random ones not already shown.
 */
export function pickReactionEmojis(
  reactionEmojis: readonly string[] = [],
  rand: () => number = Math.random,
): string[] {
  const counts = new Map<string, number>();
  for (const e of reactionEmojis) counts.set(e, (counts.get(e) ?? 0) + 1);

  const topUsed = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, REACTION_TOP_USED_COUNT)
    .map(([emoji]) => emoji);

  const remaining = EMOJI_REACTIONS.filter((e) => !topUsed.includes(e));
  const randomPick = shuffleEmojis(remaining, rand).slice(0, REACTION_DISPLAY_COUNT - topUsed.length);

  return [...topUsed, ...randomPick];
}
