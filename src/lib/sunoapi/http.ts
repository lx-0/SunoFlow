import type { SunoModel, StyleTuningOptions, SunoSong, SongStatus, TaskStatus } from "./types";
import { SUNO_API_TIMEOUT_MS, SUNOAPI_KEY, WEBHOOK_BASE_URL, SUNO_WEBHOOK_SECRET } from "@/lib/env";
import { logger } from "@/lib/logger";
import {
  CircuitOpenError,
  requestPermission,
  recordSuccess,
  recordFailure,
} from "@/lib/circuit-breaker";

export type SunoApiErrorCode =
  | "INSUFFICIENT_CREDITS"
  | "CONFLICT"
  | "VALIDATION_ERROR"
  | "COMPLIANCE_BLOCK"
  | "RATE_LIMITED"
  | "AUTH_ERROR"
  | "SERVER_ERROR"
  | "TIMEOUT"
  | "UNKNOWN";

export class SunoApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
    public readonly code: SunoApiErrorCode = "UNKNOWN",
    public readonly details?: Record<string, unknown>
  ) {
    super(message);
    this.name = "SunoApiError";
    Object.setPrototypeOf(this, SunoApiError.prototype);
  }
}

export const BASE_URL = "https://api.sunoapi.org/api/v1";
export const FILE_UPLOAD_BASE_URL = "https://sunoapiorg.redpandaai.co";

const NOOP_CALLBACK_URL = "https://localhost/noop";

/** Build the callback URL for Suno API async endpoints.
 *  When SUNO_WEBHOOK_SECRET is configured, returns a real webhook URL;
 *  otherwise falls back to the no-op URL (polling-only mode). */
export function getCallbackUrl(): string {
  if (!SUNO_WEBHOOK_SECRET) return NOOP_CALLBACK_URL;
  const base = WEBHOOK_BASE_URL.replace(/\/+$/, "");
  return `${base}/api/webhooks/suno?token=${encodeURIComponent(SUNO_WEBHOOK_SECRET)}`;
}

export const DEFAULT_MODEL: SunoModel = "V5_5";

function getTimeoutMs(): number {
  return SUNO_API_TIMEOUT_MS;
}

function isRetryable(status: number): boolean {
  // Retry transient server errors (5xx) and rate limits (429).
  return status === 429 || (status >= 500 && status <= 599);
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  maxRetries = 1
): Promise<Response> {
  // ── Circuit breaker: check before any network activity ──────────────────────
  const permission = requestPermission();
  if (permission === "blocked") {
    throw new CircuitOpenError();
  }
  // permission === "allowed" | "probe" — proceed with request

  const timeoutMs = getTimeoutMs();
  let attempt = 0;
  while (true) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    let res: Response;
    try {
      res = await fetch(url, { ...init, signal: controller.signal });
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === "AbortError") {
        recordFailure();
        throw new SunoApiError(
          0,
          `Suno API request timed out after ${timeoutMs / 1000}s`,
          "TIMEOUT"
        );
      }
      recordFailure();
      throw err;
    }
    clearTimeout(timeoutId);

    if (res.ok) {
      recordSuccess();
      return res;
    }

    if (!isRetryable(res.status) || attempt >= maxRetries) {
      let message: string;
      let rawBody: string | undefined;
      let parsedBody: Record<string, unknown> | undefined;
      try {
        rawBody = await res.text();
        parsedBody = JSON.parse(rawBody) as Record<string, unknown>;
        message = (parsedBody.msg as string) ?? (parsedBody.message as string) ?? (parsedBody.error as string) ?? res.statusText;
      } catch {
        message = rawBody || res.statusText;
      }
      const logFn = res.status === 429 ? logger.warn.bind(logger) : logger.error.bind(logger);
      logFn({ url, status: res.status, statusText: res.statusText, body: rawBody, attempt }, "suno-api: request failed");
      // Only count server errors (5xx) and timeouts toward the circuit breaker;
      // 4xx errors are client-side problems, not upstream outages.
      if (res.status >= 500 || res.status === 0) {
        recordFailure();
      }

      let errorCode: SunoApiErrorCode = "UNKNOWN";
      let errorDetails: Record<string, unknown> | undefined;
      switch (res.status) {
        case 402:
          errorCode = "INSUFFICIENT_CREDITS";
          break;
        case 409:
          errorCode = "CONFLICT";
          break;
        case 422:
          errorCode = "VALIDATION_ERROR";
          if (parsedBody) errorDetails = { validation: parsedBody };
          break;
        case 451:
          errorCode = "COMPLIANCE_BLOCK";
          break;
        case 429:
          errorCode = "RATE_LIMITED";
          break;
        case 401:
        case 403:
          errorCode = "AUTH_ERROR";
          break;
        default:
          if (res.status >= 500) errorCode = "SERVER_ERROR";
      }

      throw new SunoApiError(res.status, message, errorCode, errorDetails);
    }

    // For 429 responses, respect Retry-After header (seconds) with a minimum
    // of 2s; for 5xx errors use a shorter exponential backoff.
    let delay: number;
    if (res.status === 429) {
      const retryAfter = parseInt(res.headers.get("Retry-After") || "", 10);
      delay = (Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2000) * Math.pow(2, attempt);
    } else {
      delay = 200 * Math.pow(2, attempt);
    }
    await new Promise((resolve) => setTimeout(resolve, delay));
    attempt++;
  }
}

export function buildHeaders(apiKey?: string): HeadersInit {
  const key = apiKey || SUNOAPI_KEY;
  if (!key) {
    throw new SunoApiError(0, "SUNOAPI_KEY environment variable is not set");
  }
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${key}`,
  };
}

/** Extract taskId from a standard { code, msg, data: { taskId } } response */
export async function extractTaskId(res: Response, context: string): Promise<string> {
  const json = (await res.json()) as { code?: number; msg?: string; data?: { taskId?: string } };
  if (!json.data?.taskId) {
    throw new SunoApiError(500, `No taskId returned from ${context}`);
  }
  return json.data.taskId;
}

/** Append style-tuning fields to a request body if present */
export function applyStyleTuning(body: Record<string, unknown>, opts: StyleTuningOptions): void {
  if (opts.personaId != null) body.personaId = opts.personaId;
  if (opts.personaModel != null) body.personaModel = opts.personaModel;
  if (opts.negativeTags != null) body.negativeTags = opts.negativeTags;
  if (opts.vocalGender != null) body.vocalGender = opts.vocalGender;
  if (opts.styleWeight != null) body.styleWeight = opts.styleWeight;
  if (opts.weirdnessConstraint != null) body.weirdnessConstraint = opts.weirdnessConstraint;
  if (opts.audioWeight != null) body.audioWeight = opts.audioWeight;
}

/** Map raw API song data (snake_case) to our SunoSong interface */
export function mapRawSong(raw: Record<string, unknown>): SunoSong {
  return {
    id: (raw.id as string) ?? "",
    title: (raw.title as string) ?? "",
    prompt: (raw.prompt as string) ?? "",
    tags: (raw.tags as string) ?? undefined,
    audioUrl: (raw.audio_url as string) ?? (raw.audioUrl as string) ?? "",
    streamAudioUrl: (raw.stream_audio_url as string) ?? (raw.streamAudioUrl as string) ?? undefined,
    imageUrl: (raw.image_url as string) ?? (raw.imageUrl as string) ?? undefined,
    duration: (raw.duration as number) ?? undefined,
    status: "pending",
    model: (raw.model_name as string) ?? (raw.modelName as string) ?? undefined,
    lyrics: (raw.prompt as string) ?? undefined,
    createdAt: (raw.createTime as string) ?? (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

/** Map task status to our SongStatus */
export function taskStatusToSongStatus(status: TaskStatus): SongStatus {
  if (status === "SUCCESS") return "complete";
  if (
    status === "CREATE_TASK_FAILED" ||
    status === "GENERATE_AUDIO_FAILED" ||
    status === "CALLBACK_EXCEPTION" ||
    status === "SENSITIVE_WORD_ERROR"
  ) {
    return "error";
  }
  return "pending";
}
