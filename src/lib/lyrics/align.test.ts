import { describe, expect, it } from "vitest";
import { alignWordsToLines, type AlignedWordEntry } from "./align";

function words(...entries: [string, number][]): AlignedWordEntry[] {
  return entries.map(([word, startS]) => ({ word, startS, endS: startS + 0.4 }));
}

describe("alignWordsToLines", () => {
  it("maps each line to the start time of its first word", () => {
    const lyrics = "Hello world\nSecond line here";
    const aligned = words(
      ["Hello", 0.5],
      ["world", 1.0],
      ["Second", 4.2],
      ["line", 4.8],
      ["here", 5.1],
    );

    expect(alignWordsToLines(lyrics, aligned)).toEqual([
      { lineIndex: 0, startTime: 0.5 },
      { lineIndex: 1, startTime: 4.2 },
    ]);
  });

  it("handles section tags bundled with the next word via embedded newlines", () => {
    // Real-world shape from the sunoapi docs: "[Verse]\nWaggin'"
    const lyrics = "[Verse]\nWaggin' tails all day";
    const aligned = words(
      ["[Verse]\nWaggin'", 1.36],
      ["tails", 1.8],
      ["all", 2.0],
      ["day", 2.2],
    );

    expect(alignWordsToLines(lyrics, aligned)).toEqual([
      { lineIndex: 0, startTime: 1.36 },
      { lineIndex: 1, startTime: 1.36 },
    ]);
  });

  it("matches despite punctuation and casing differences", () => {
    const lyrics = "don't stop, believing!";
    const aligned = words(["Don't", 2.0], ["STOP", 2.4], ["believing", 2.9]);

    expect(alignWordsToLines(lyrics, aligned)).toEqual([
      { lineIndex: 0, startTime: 2.0 },
    ]);
  });

  it("skips extra transcribed words within the lookahead window", () => {
    const lyrics = "run away tonight";
    const aligned = words(
      ["run", 1.0],
      ["oh", 1.2],
      ["oh", 1.4],
      ["away", 1.6],
      ["tonight", 2.0],
    );

    expect(alignWordsToLines(lyrics, aligned)).toEqual([
      { lineIndex: 0, startTime: 1.0 },
    ]);
  });

  it("gives empty lines no timestamp", () => {
    const lyrics = "first line\n\nthird line";
    const aligned = words(
      ["first", 0.0],
      ["line", 0.3],
      ["third", 3.0],
      ["line", 3.3],
    );

    expect(alignWordsToLines(lyrics, aligned)).toEqual([
      { lineIndex: 0, startTime: 0.0 },
      { lineIndex: 2, startTime: 3.0 },
    ]);
  });

  it("returns nothing when the words do not match the lyrics", () => {
    const lyrics = "completely different text here";
    const aligned = words(["nothing", 0.0], ["matches", 0.5], ["at", 0.9], ["all", 1.2]);

    expect(alignWordsToLines(lyrics, aligned)).toEqual([]);
  });

  it("returns nothing for empty inputs", () => {
    expect(alignWordsToLines("", words(["a", 0]))).toEqual([]);
    expect(alignWordsToLines("some lyrics", [])).toEqual([]);
    expect(alignWordsToLines("\n\n", words(["a", 0]))).toEqual([]);
  });

  it("skips malformed aligned-word entries without dropping valid ones", () => {
    const lyrics = "hello world";
    const aligned = [
      { word: "hello", startS: 0.5, endS: 0.9 },
      { word: 42, startS: 1.0, endS: 1.2 },
      { word: "world", startS: "bad", endS: 1.6 },
    ] as unknown as AlignedWordEntry[];

    expect(alignWordsToLines(lyrics, aligned)).toEqual([
      { lineIndex: 0, startTime: 0.5 },
    ]);
  });
});
