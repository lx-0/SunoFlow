import { apiPost } from "./client";

// Style boost: POST /api/style-boost { content } → { result } (an enhanced style
// description from Suno). Returns the boosted string, or the original on a
// malformed response. Throws HttpError on failure (caller maps it).
export async function boostStyle(content: string): Promise<string> {
  const res = await apiPost<{ result?: string }>("/api/style-boost", { content });
  return typeof res?.result === "string" && res.result.trim() ? res.result : content;
}
