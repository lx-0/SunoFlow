import { prisma } from "@/lib/prisma";
import { generateText } from "@/lib/llm";
import { acquireRateLimitSlot } from "@/lib/rate-limit";
export {
  listLyricAnnotations,
  listLyricTimestamps,
  replaceLyricTimestamps,
  upsertLyricAnnotation,
} from "./crud";
export { syncLyricTimestamps } from "./sync";

const SYSTEM_PROMPT =
  "You are a professional songwriter. Turn the SOURCE TEXT the user provides " +
  "(often a full news article or blog post, sometimes just a theme) into a " +
  "COMPLETE, original song, and propose a fitting title and musical style.\n\n" +
  "Respond EXACTLY in this format and nothing else:\n" +
  "TITLE: <a short, evocative song title, 2-6 words>\n" +
  "STYLE: <comma-separated genre and mood tags for the MUSIC, 3-8 words, " +
  'e.g. "melancholic indie folk, fingerpicked guitar, soft vocals">\n' +
  "LYRICS:\n" +
  "<the complete lyrics, clearly structured: multiple verses, a recurring " +
  "chorus and a bridge, labelled [Verse 1], [Chorus], [Bridge], etc. Capture " +
  "the actual story, ideas and emotional arc of the source text; do not just " +
  "name the topic. Aim for a real, full-length song.>\n\n" +
  "Put ONLY genre/mood tags on the STYLE line — never put style words into the " +
  "lyrics. When reference lyrics are provided, use them ONLY for stylistic " +
  "guidance — never copy their words or subject.";

const MAX_REFERENCE_SONGS = 5;

// ── Types ───────────────────────────────────────────────────────────────

export interface GeneratedSong {
  title: string;
  style: string;
  lyrics: string;
}

export type GenerateLyricsResult =
  | {
      ok: true;
      lyrics: string;
      title: string;
      style: string;
      referenceSongs: Array<{ id: string; title: string | null }>;
    }
  | { ok: false; code: "RATE_LIMITED"; resetAt: string; retryAfterSec: number }
  | { ok: false; code: "GENERATION_FAILED" };

// ── Core ────────────────────────────────────────────────────────────────

export async function generateLyrics(
  userId: string,
  prompt: string
): Promise<GenerateLyricsResult> {
  const { acquired, status: rateLimitStatus } = await acquireRateLimitSlot(
    userId,
    "lyrics_generate"
  );
  if (!acquired) {
    const resetAt = new Date(rateLimitStatus.resetAt);
    const retryAfterSec = Math.ceil(
      (resetAt.getTime() - Date.now()) / 1000
    );
    return {
      ok: false,
      code: "RATE_LIMITED",
      resetAt: rateLimitStatus.resetAt,
      retryAfterSec: Math.max(1, retryAfterSec),
    };
  }

  const referenceSongs = await selectReferenceSongs(userId);
  const song = await generateLyricsFromSource(prompt, referenceSongs);

  if (!song) {
    return { ok: false, code: "GENERATION_FAILED" };
  }

  return {
    ok: true,
    lyrics: song.lyrics,
    title: song.title,
    style: song.style,
    referenceSongs: referenceSongs.map((s) => ({ id: s.id, title: s.title })),
  };
}

// Parse the delimited TITLE/STYLE/LYRICS response. Delimited (not JSON) because
// multi-line lyrics with quotes reliably break JSON. Degrades gracefully if the
// model omits the markers (whole output becomes the lyrics).
export function parseSong(raw: string | null): GeneratedSong | null {
  if (!raw) return null;
  const text = raw.replace(/\r\n/g, "\n").trim();
  const titleM = text.match(/^\s*TITLE:\s*(.+)$/im);
  const styleM = text.match(/^\s*STYLE:\s*(.+)$/im);
  const lyrM = text.match(/^\s*LYRICS:\s*\n?/im);

  let lyrics: string;
  if (lyrM && lyrM.index !== undefined) {
    lyrics = text.slice(lyrM.index + lyrM[0].length).trim();
  } else {
    lyrics = text
      .replace(/^\s*TITLE:.*$/im, "")
      .replace(/^\s*STYLE:.*$/im, "")
      .trim();
  }
  if (lyrics.length < 1) return null;

  return {
    title: titleM ? titleM[1].trim().replace(/^["']|["']$/g, "") : "",
    style: styleM ? styleM[1].trim() : "",
    lyrics,
  };
}

// ── Internals ───────────────────────────────────────────────────────────

interface ReferenceSong {
  id: string;
  title: string | null;
  lyrics: string | null;
}

/**
 * Pure LLM core: turn source text (a full article or a theme) into a complete
 * song — title, style and full lyrics. No DB / rate-limit, so it's independently
 * testable. `generateLyrics` wraps this with rate-limiting and reference songs.
 */
export async function generateLyricsFromSource(
  sourceText: string,
  referenceSongs: ReferenceSong[] = []
): Promise<GeneratedSong | null> {
  const userPrompt = buildPrompt(sourceText, referenceSongs);
  const raw = await generateText(SYSTEM_PROMPT, userPrompt);
  return parseSong(raw);
}

async function selectReferenceSongs(userId: string): Promise<ReferenceSong[]> {
  const favoriteSongs = await prisma.song.findMany({
    where: {
      userId,
      favorites: { some: { userId } },
      lyrics: { not: null },
    },
    orderBy: [{ rating: "desc" }, { downloadCount: "desc" }],
    take: MAX_REFERENCE_SONGS,
    select: { id: true, title: true, lyrics: true },
  });

  if (favoriteSongs.length >= MAX_REFERENCE_SONGS) {
    return favoriteSongs;
  }

  const existingIds = favoriteSongs.map((s) => s.id);
  const ratedSongs = await prisma.song.findMany({
    where: {
      userId,
      rating: { not: null },
      lyrics: { not: null },
      id: { notIn: existingIds },
    },
    orderBy: [{ rating: "desc" }, { downloadCount: "desc" }],
    take: MAX_REFERENCE_SONGS - favoriteSongs.length,
    select: { id: true, title: true, lyrics: true },
  });

  return [...favoriteSongs, ...ratedSongs];
}

function buildPrompt(prompt: string, referenceSongs: ReferenceSong[]): string {
  const source = `SOURCE TEXT to turn into a complete song:\n\n${prompt.trim()}`;
  if (referenceSongs.length === 0) {
    return source;
  }

  const referenceContext = referenceSongs
    .map(
      (s, i) =>
        `--- Reference ${i + 1}: "${s.title ?? "Untitled"}" ---\n${s.lyrics}`
    )
    .join("\n\n");

  return `${source}\n\nReference lyrics for STYLE inspiration only (do not copy words or subject):\n\n${referenceContext}`;
}
