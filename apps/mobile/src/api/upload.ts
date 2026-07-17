import { asRecord, asString, uploadBodySchema, type UploadBody } from "@sunoflow/core";
import { apiPost, HttpError } from "./client";
import { GenerationError, type StartedGeneration } from "./generate";

// Cover / extend from an uploaded audio file (base64) or a URL. Body validated
// against the SHARED @sunoflow/core uploadBodySchema. Response mirrors
// /api/generate ({ songs: [song] }); caller polls status after.

interface UploadResponse {
  songs?: unknown[];
  song?: unknown;
  id?: string;
  title?: string | null;
  error?: string;
}

function extractId(data: UploadResponse): { id: string; title: string | null } | null {
  const s = asRecord((Array.isArray(data.songs) ? data.songs[0] : undefined) ?? data.song);
  const id = s ? asString(s.id) : null;
  if (s && id) return { id, title: asString(s.title) };
  if (typeof data.id === "string") return { id: data.id, title: asString(data.title) };
  return null;
}

export async function startUpload(body: UploadBody): Promise<StartedGeneration> {
  const parsed = uploadBodySchema.safeParse(body);
  if (!parsed.success) {
    throw new GenerationError(parsed.error.issues[0]?.message ?? "Invalid upload", "validation");
  }

  let data: UploadResponse;
  try {
    data = await apiPost<UploadResponse>("/api/upload", parsed.data);
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 402) throw new GenerationError(err.message || "You're out of credits.", "insufficient_credits");
      if (err.status === 429) throw new GenerationError(err.message || "Rate limit reached. Try again later.", "rate_limit");
      if (err.status === 503) throw new GenerationError(err.message || "Upload is temporarily unavailable.", "unavailable");
      throw new GenerationError(err.message || `Upload failed (HTTP ${err.status})`, "unknown");
    }
    throw new GenerationError("Network error. Check your connection and try again.", "unknown");
  }

  if (data.error) throw new GenerationError(data.error, "soft_failure");
  const song = extractId(data);
  if (!song) throw new GenerationError("Upload started but no song was returned.", "unknown");
  return { songId: song.id, title: song.title };
}
