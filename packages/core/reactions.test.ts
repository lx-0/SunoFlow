import { describe, it, expect } from "vitest";
import {
  EMOJI_REACTIONS,
  REACTION_DISPLAY_COUNT,
  REACTION_TOP_USED_COUNT,
  shuffleEmojis,
  pickReactionEmojis,
} from "./reactions";

describe("shuffleEmojis", () => {
  it("does not mutate the input and keeps the same elements", () => {
    const input = ["a", "b", "c", "d"];
    const out = shuffleEmojis(input, () => 0);
    expect(input).toEqual(["a", "b", "c", "d"]);
    expect([...out].sort()).toEqual(["a", "b", "c", "d"]);
    expect(out).toHaveLength(4);
  });

  it("is deterministic for a fixed rand", () => {
    const a = shuffleEmojis(["a", "b", "c", "d"], () => 0);
    const b = shuffleEmojis(["a", "b", "c", "d"], () => 0);
    expect(a).toEqual(b);
  });
});

describe("pickReactionEmojis", () => {
  it("returns REACTION_DISPLAY_COUNT distinct emojis from the set when none are used", () => {
    const out = pickReactionEmojis([], () => 0);
    expect(out).toHaveLength(REACTION_DISPLAY_COUNT);
    expect(new Set(out).size).toBe(REACTION_DISPLAY_COUNT);
    for (const e of out) expect(EMOJI_REACTIONS).toContain(e);
  });

  it("surfaces the most-used emojis first, ordered by frequency", () => {
    const out = pickReactionEmojis(["🔥", "🔥", "🤯"], () => 0);
    expect(out.slice(0, 2)).toEqual(["🔥", "🤯"]);
    expect(out).toHaveLength(REACTION_DISPLAY_COUNT);
  });

  it("caps the used section at REACTION_TOP_USED_COUNT and pads the rest", () => {
    const used = ["🔥", "🤯", "😭", "🥵", "💀"]; // 5 distinct
    const out = pickReactionEmojis(used, () => 0);
    expect(out).toHaveLength(REACTION_DISPLAY_COUNT);
    // only the top 4 used appear in the leading section
    const leading = out.slice(0, REACTION_TOP_USED_COUNT);
    expect(leading).not.toContain("💀");
  });

  it("never duplicates between the used section and the random padding", () => {
    const out = pickReactionEmojis(["🔥", "🤯"], () => 0);
    expect(new Set(out).size).toBe(out.length);
  });
});
