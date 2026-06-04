import { mashupRequestSchema } from "@sunoflow/core";
import { apiPost, HttpError } from "./client";
import { GenerationError, type StartedGeneration } from "./generate";

// Mashup two songs → a new generated song. Body validated against the SHARED
// @sunoflow/core mashupRequestSchema (same the web route validates with). The
// response mirrors /api/generate ({ songs: [song] }); caller polls status after.

export interface MashupInput {
  trackAId: string;
  trackBId: string;
  title?: string;
  style?: string;
  prompt?: string;
  instrumental?: boolean;
}

interface MashupResponse {
  songs?: unknown[];
  song?: unknown;
  id?: string;
  title?: string | null;
  error?: string;
}

function extractId(data: MashupResponse): { id: string; title: string | null } | null {
  const raw = (Array.isArray(data.songs) ? data.songs[0] : undefined) ?? data.song;
  if (raw && typeof raw === "object") {
    const s = raw as Record<string, unknown>;
    if (typeof s.id === "string") return { id: s.id, title: typeof s.title === "string" ? s.title : null };
  }
  if (typeof data.id === "string") return { id: data.id, title: typeof data.title === "string" ? data.title : null };
  return null;
}

export async function startMashup(input: MashupInput): Promise<StartedGeneration> {
  const parsed = mashupRequestSchema.safeParse({
    trackA: { songId: input.trackAId },
    trackB: { songId: input.trackBId },
    title: input.title?.trim() || undefined,
    style: input.style?.trim() || undefined,
    prompt: input.prompt?.trim() || undefined,
    instrumental: input.instrumental,
  });
  if (!parsed.success) {
    throw new GenerationError(parsed.error.issues[0]?.message ?? "Invalid mashup input", "validation");
  }

  let data: MashupResponse;
  try {
    data = await apiPost<MashupResponse>("/api/mashup", parsed.data);
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 402) throw new GenerationError(err.message || "You're out of credits.", "insufficient_credits");
      if (err.status === 429) throw new GenerationError(err.message || "Rate limit reached. Try again later.", "rate_limit");
      if (err.status === 503) throw new GenerationError(err.message || "Mashup is temporarily unavailable.", "unavailable");
      throw new GenerationError(err.message || `Mashup failed (HTTP ${err.status})`, "unknown");
    }
    throw new GenerationError("Network error. Check your connection and try again.", "unknown");
  }

  if (data.error) throw new GenerationError(data.error, "soft_failure");
  const song = extractId(data);
  if (!song) throw new GenerationError("Mashup started but no song was returned.", "unknown");
  return { songId: song.id, title: song.title };
}
