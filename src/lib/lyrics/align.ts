/**
 * Maps Suno's word-level aligned lyrics onto the per-line index space used by
 * the LyricTimestamp table (lineIndex = index into lyrics.split("\n")).
 *
 * Aligned word strings may bundle section tags and line breaks with the
 * following sung word (e.g. "[Verse]\nWaggin'"), so entries are re-tokenized
 * on whitespace before matching.
 */

export interface AlignedWordEntry {
  word: string;
  startS: number;
  endS: number;
}

export interface LineTimestampEntry {
  lineIndex: number;
  startTime: number;
}

// Below this share of matched lyric tokens the alignment is considered a
// mismatch (wrong clip, heavily edited lyrics) and nothing is returned.
const MIN_MATCH_RATIO = 0.5;

// How many word tokens ahead the matcher may skip to absorb adlibs or
// transcription extras without losing the rest of the song.
const LOOKAHEAD = 5;

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

export function alignWordsToLines(
  lyrics: string,
  alignedWords: AlignedWordEntry[],
): LineTimestampEntry[] {
  if (!lyrics.trim() || alignedWords.length === 0) return [];

  const lyricTokens: { lineIndex: number; norm: string }[] = [];
  lyrics.split("\n").forEach((line, lineIndex) => {
    for (const raw of line.split(/\s+/)) {
      const norm = normalizeToken(raw);
      if (norm) lyricTokens.push({ lineIndex, norm });
    }
  });
  if (lyricTokens.length === 0) return [];

  const wordTokens: { norm: string; startS: number }[] = [];
  for (const entry of alignedWords) {
    if (typeof entry?.word !== "string" || typeof entry.startS !== "number") {
      continue;
    }
    for (const raw of entry.word.split(/\s+/)) {
      const norm = normalizeToken(raw);
      if (norm) wordTokens.push({ norm, startS: entry.startS });
    }
  }
  if (wordTokens.length === 0) return [];

  const lineStart = new Map<number, number>();
  let matched = 0;
  let wi = 0;
  for (const token of lyricTokens) {
    const limit = Math.min(wordTokens.length, wi + LOOKAHEAD + 1);
    for (let j = wi; j < limit; j++) {
      if (wordTokens[j].norm === token.norm) {
        if (!lineStart.has(token.lineIndex)) {
          lineStart.set(token.lineIndex, wordTokens[j].startS);
        }
        matched++;
        wi = j + 1;
        break;
      }
    }
  }

  if (matched / lyricTokens.length < MIN_MATCH_RATIO) return [];

  return Array.from(lineStart.entries())
    .map(([lineIndex, startTime]) => ({ lineIndex, startTime }))
    .sort((a, b) => a.lineIndex - b.lineIndex);
}
