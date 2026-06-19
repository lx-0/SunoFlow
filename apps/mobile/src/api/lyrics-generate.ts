import { apiPost } from "./client";

// AI lyrics generation: POST /api/lyrics/generate { prompt } → { lyrics, title, style }.
// `prompt` is the source text (a full article or a theme); the backend turns it
// into a complete song and also proposes a title and a musical style. Throws
// HttpError on failure (429 rate-limit / 500) for the caller to map.
export interface GeneratedLyrics {
  lyrics: string;
  title: string;
  style: string;
}

export async function generateLyrics(prompt: string): Promise<GeneratedLyrics> {
  const res = await apiPost<{ lyrics?: string; title?: string; style?: string }>(
    "/api/lyrics/generate",
    { prompt },
  );
  return {
    lyrics: typeof res?.lyrics === "string" ? res.lyrics : "",
    title: typeof res?.title === "string" ? res.title : "",
    style: typeof res?.style === "string" ? res.style : "",
  };
}
