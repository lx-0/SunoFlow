import { describe, it, expect } from "vitest";
import {
  parseTags,
  splitTagCsv,
  normalizedTagList,
  firstTag,
  normalizeTagCombo,
  collectSongTokens,
  tagOverlapScore,
  countGenres,
} from "./tags";

describe("parseTags", () => {
  it("splits on commas, semicolons, and whitespace; lowercases; drops empties", () => {
    expect(parseTags("Rock, Pop")).toEqual(["rock", "pop"]);
    expect(parseTags("a;b c")).toEqual(["a", "b", "c"]);
    expect(parseTags("ROCK,,pop")).toEqual(["rock", "pop"]);
  });
  it("handles nullish / blank", () => {
    expect(parseTags(null)).toEqual([]);
    expect(parseTags("   ")).toEqual([]);
  });
});

describe("splitTagCsv", () => {
  it("splits on commas only and preserves case", () => {
    expect(splitTagCsv("Rock, Pop")).toEqual(["Rock", "Pop"]);
    expect(splitTagCsv("a;b")).toEqual(["a;b"]);
  });
  it("trims and drops empty segments", () => {
    expect(splitTagCsv("a, ,b,")).toEqual(["a", "b"]);
    expect(splitTagCsv(null)).toEqual([]);
  });
});

describe("normalizedTagList / firstTag / normalizeTagCombo", () => {
  it("normalizedTagList lowercases the csv split", () => {
    expect(normalizedTagList("Rock, POP")).toEqual(["rock", "pop"]);
  });
  it("firstTag returns the first csv tag (case preserved) or null", () => {
    expect(firstTag("Rock, Pop")).toBe("Rock");
    expect(firstTag("")).toBeNull();
    expect(firstTag(null)).toBeNull();
  });
  it("normalizeTagCombo lowercases, sorts, and comma-joins", () => {
    expect(normalizeTagCombo("Pop, rock")).toBe("pop, rock");
    expect(normalizeTagCombo("B,a")).toBe("a, b");
    expect(normalizeTagCombo(null)).toBe("");
  });
});

describe("collectSongTokens", () => {
  it("merges relation tags + freetext tags, lowercased and de-duplicated", () => {
    const tokens = collectSongTokens(
      [{ tag: { name: "Rock" } }, { tag: { name: "Pop" } }],
      "rock, jazz",
    );
    expect(tokens.sort()).toEqual(["jazz", "pop", "rock"]);
  });
});

describe("tagOverlapScore", () => {
  it("is 0 when both sides are empty", () => {
    expect(tagOverlapScore([], [])).toBe(0);
  });
  it("is shared / max(len)", () => {
    expect(tagOverlapScore(["a"], ["a"])).toBe(1);
    expect(tagOverlapScore(["a", "b"], ["a"])).toBe(0.5);
    expect(tagOverlapScore(["a"], ["b"])).toBe(0);
  });
});

describe("countGenres", () => {
  it("counts csv tags, lowercased, sorted by count desc, capped at the limit", () => {
    const songs = [
      { tags: "Rock, Pop" },
      { tags: "rock" },
      { tags: "Jazz" },
      { tags: null },
    ];
    const result = countGenres(songs);
    expect(result[0]).toEqual({ genre: "rock", count: 2 });
    expect(result).toHaveLength(3);
    expect(result.map((r) => r.genre).sort()).toEqual(["jazz", "pop", "rock"]);
  });
  it("respects the limit", () => {
    const songs = [{ tags: "a,b,c,d" }];
    expect(countGenres(songs, 2)).toHaveLength(2);
  });
});
