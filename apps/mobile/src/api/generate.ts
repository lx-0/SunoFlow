import { apiGet, apiPost, HttpError } from "./client";
import {
  asRecord,
  asString,
  generateSongRequestSchema,
  isTerminalGenerationStatus,
  type GenerateSongRequest,
} from "@sunoflow/core";

// Song generation against the real backend (bearer-authed). The request body is
// validated client-side against the SAME zod schema the web route uses for
// server-side validation (@sunoflow/core) — one contract, both ends.
//
// /api/generate responds 201 with { songs: [song] } (arrayFormat). Even a
// soft-failure (e.g. Suno credit error at API-call time) comes back 201 but
// carries an `error` field + optional `creditBalance`. Hard gating happens
// before generation: 402 (insufficient credits), 429 (rate limit), 503 (queued
// / service unavailable). We map all of these to a typed result so the screen
// can render the right state.

export interface StartedGeneration {
  /** The created song's id — feed this to pollStatus(). */
  songId: string;
  title: string | null;
}

export class GenerationError extends Error {
  constructor(
    message: string,
    public readonly kind:
      | "validation"
      | "insufficient_credits"
      | "rate_limit"
      | "unavailable"
      | "soft_failure"
      | "unknown",
    public readonly creditBalance?: number,
    public readonly resetAt?: string,
  ) {
    super(message);
    this.name = "GenerationError";
  }
}

interface GenerateResponse {
  songs?: unknown[];
  song?: unknown;
  id?: string;
  title?: string | null;
  error?: string;
  creditBalance?: number;
  queued?: boolean;
  message?: string;
  rateLimit?: { remaining?: number; resetAt?: string };
  details?: { resetAt?: string; rateLimit?: { resetAt?: string } };
}

function extractSong(data: GenerateResponse): { id: string; title: string | null } | null {
  const s = asRecord((Array.isArray(data.songs) ? data.songs[0] : undefined) ?? data.song);
  const id = s ? asString(s.id) : null;
  if (s && id) {
    return { id, title: asString(s.title) };
  }
  if (typeof data.id === "string") {
    return { id: data.id, title: asString(data.title) };
  }
  return null;
}

/**
 * POST /api/generate. Validates `body` against the shared core schema, then maps
 * the response (including soft-failures and gating errors) to a typed result.
 * Throws GenerationError on any failure path.
 */
export async function startGeneration(body: GenerateSongRequest): Promise<StartedGeneration> {
  const parsed = generateSongRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new GenerationError(parsed.error.issues[0]?.message ?? "Invalid input", "validation");
  }

  let data: GenerateResponse;
  try {
    data = await apiPost<GenerateResponse>("/api/generate", parsed.data);
  } catch (err) {
    if (err instanceof HttpError) {
      if (err.status === 402) {
        throw new GenerationError(
          err.message || "You're out of credits.",
          "insufficient_credits",
        );
      }
      if (err.status === 429) {
        throw new GenerationError(
          err.message || "Rate limit reached. Try again later.",
          "rate_limit",
        );
      }
      if (err.status === 503) {
        throw new GenerationError(
          err.message || "Generation is temporarily unavailable. Please try again later.",
          "unavailable",
        );
      }
      throw new GenerationError(err.message || `Generation failed (HTTP ${err.status})`, "unknown");
    }
    throw new GenerationError("Network error. Check your connection and try again.", "unknown");
  }

  // 201 soft-failure: response carries an `error` (e.g. Suno 402 mid-call).
  if (data.error) {
    const isCredits = data.creditBalance !== undefined;
    throw new GenerationError(
      data.error,
      isCredits ? "insufficient_credits" : "soft_failure",
      data.creditBalance,
    );
  }

  const song = extractSong(data);
  if (!song) {
    throw new GenerationError("Generation started but no song was returned.", "unknown");
  }
  return { songId: song.id, title: song.title };
}

export interface StatusResult {
  /** "pending" | "processing" | "ready" | "failed" (raw backend value). */
  status: string;
  terminal: boolean;
  ready: boolean;
  failed: boolean;
  errorMessage: string | null;
  /** Present once ready. */
  audioUrl: string | null;
  title: string | null;
}

interface StatusResponse {
  song?: {
    generationStatus?: string;
    errorMessage?: string | null;
    audioUrl?: string | null;
    title?: string | null;
  } | null;
}

/**
 * GET /api/songs/[id]/status — a single poll tick. The backend advances its own
 * poll counter and writes terminal state; we just read + defensively map. The
 * caller is responsible for the polling loop / interval.
 */
export async function pollStatus(songId: string): Promise<StatusResult> {
  const data = await apiGet<StatusResponse>(`/api/songs/${songId}/status`);
  const song = data.song ?? null;
  const status = asString(song?.generationStatus) ?? "pending";
  const terminal = isTerminalGenerationStatus(status);
  return {
    status,
    terminal,
    ready: status === "ready",
    failed: status === "failed",
    errorMessage: asString(song?.errorMessage),
    audioUrl: asString(song?.audioUrl),
    title: asString(song?.title),
  };
}
