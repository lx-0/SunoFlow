import { apiPost } from "./client";

// AI lyrics generation: POST /api/lyrics/generate { prompt } → { lyrics }.
// `prompt` is a theme/description; the backend uses the user's favorites as
// reference. Returns the generated lyrics string. Throws HttpError on failure
// (429 rate-limit / 500) for the caller to map.
export async function generateLyrics(prompt: string): Promise<string> {
  const res = await apiPost<{ lyrics?: string }>("/api/lyrics/generate", { prompt });
  return typeof res?.lyrics === "string" ? res.lyrics : "";
}
