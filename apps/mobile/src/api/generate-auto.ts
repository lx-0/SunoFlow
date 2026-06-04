import { apiPost } from "./client";

// AI auto-fill: POST /api/generate/auto { prompt } → { title, style, lyricsPrompt }.
// Turns a rough idea into concrete song fields (uses the user's favorites as
// reference server-side). Used to prefill the Generate form.

export interface AutoFillResult {
  title: string;
  style: string;
  lyricsPrompt: string;
}

export async function autoFill(prompt: string): Promise<AutoFillResult> {
  const res = await apiPost<{ title?: string; style?: string; lyricsPrompt?: string }>(
    "/api/generate/auto",
    { prompt },
  );
  return {
    title: typeof res?.title === "string" ? res.title : "",
    style: typeof res?.style === "string" ? res.style : "",
    lyricsPrompt: typeof res?.lyricsPrompt === "string" ? res.lyricsPrompt : "",
  };
}
