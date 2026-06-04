import { apiPost, HttpError } from "./client";
import { GenerationError } from "./generate";

// Batch generation: POST /api/songs/batch-generate { configs: [...] } → kicks off
// N generations server-side. We don't poll each one — they surface in the library
// as they finish. Each config mirrors a single /api/generate body.

export interface BatchConfig {
  prompt: string;
  title?: string;
  tags?: string;
  makeInstrumental?: boolean;
  personaId?: string;
}

export async function startBatch(configs: BatchConfig[]): Promise<{ count: number }> {
  try {
    const data = await apiPost<{ count?: number; results?: unknown[] }>(
      "/api/songs/batch-generate",
      { configs },
    );
    const count =
      typeof data?.count === "number"
        ? data.count
        : Array.isArray(data?.results)
          ? data.results.length
          : configs.length;
    return { count };
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 402) throw new GenerationError(err.message || "You're out of credits.", "insufficient_credits");
      if (err.status === 429) throw new GenerationError(err.message || "Rate limit reached. Try again later.", "rate_limit");
      throw new GenerationError(err.message || `Batch generation failed (HTTP ${err.status})`, "unknown");
    }
    throw new GenerationError("Network error. Check your connection and try again.", "unknown");
  }
}
