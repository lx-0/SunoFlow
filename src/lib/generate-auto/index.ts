import { generateText } from "@/lib/llm";

export const MAX_REFERENCE_SONGS = 3;

export const SYSTEM_PROMPT = `You are a creative music generator. Given a description or prompt, generate:
1. A catchy song title (short, 2-6 words)
2. A music style/genre description (comma-separated tags, 3-8 words, e.g. "dreamy indie pop, ethereal vocals, reverb guitar")
3. A lyrics prompt (a vivid 1-2 sentence description of the song's theme and mood, used to generate lyrics)

Respond ONLY with valid JSON in this exact format:
{"title": "...", "style": "...", "lyricsPrompt": "..."}

Consider the user's musical taste if reference songs are provided. Be creative and specific.`;

export interface FavoriteSongReference {
  title: string | null;
  tags: string | null;
}

export interface AutoGenerationResult {
  title: string;
  style: string;
  lyricsPrompt: string;
}

interface ParsedAutoGenerationResult {
  title?: string;
  style?: string;
  lyricsPrompt?: string;
}

export function buildUserPrompt(prompt: string, favoriteSongs: FavoriteSongReference[]): string {
  let userPrompt = `Description: ${prompt}`;

  if (favoriteSongs.length === 0) {
    return userPrompt;
  }

  const referenceContext = favoriteSongs
    .map((song) => `"${song.title ?? "Untitled"}"${song.tags ? ` (${song.tags})` : ""}`)
    .join(", ");

  userPrompt += `\n\nUser's favorite songs for style reference: ${referenceContext}`;

  return userPrompt;
}

export function parseAutoGenerationResult(raw: string | null): AutoGenerationResult | null {
  if (!raw) return null;

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : raw) as ParsedAutoGenerationResult;

    return {
      title: parsed.title ?? "",
      style: parsed.style ?? "",
      lyricsPrompt: parsed.lyricsPrompt ?? "",
    };
  } catch {
    return null;
  }
}

export async function generateAutoSongDetails(
  prompt: string,
  favoriteSongs: FavoriteSongReference[],
): Promise<AutoGenerationResult | null> {
  const userPrompt = buildUserPrompt(prompt, favoriteSongs);
  const raw = await generateText(SYSTEM_PROMPT, userPrompt);

  return parseAutoGenerationResult(raw);
}
