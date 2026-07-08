import type { StyleTuningOptions, SunoSong, SongStatus, TaskStatus } from "./types";
import { SunoApiError } from "./errors";

const TERMINAL_FAILURE_STATUSES: ReadonlySet<TaskStatus> = new Set<TaskStatus>([
  "CREATE_TASK_FAILED",
  "GENERATE_AUDIO_FAILED",
  "CALLBACK_EXCEPTION",
  "SENSITIVE_WORD_ERROR",
]);

export function isTerminalFailure(status: TaskStatus): boolean {
  return TERMINAL_FAILURE_STATUSES.has(status);
}

export async function extractTaskId(res: Response, context: string): Promise<string> {
  const json = (await res.json()) as { code?: number; msg?: string; data?: { taskId?: string } };
  if (!json.data?.taskId) {
    throw new SunoApiError(500, `No taskId returned from ${context}`);
  }
  return json.data.taskId;
}

// Suno's permanent per-clip CDN. The aggregator's record-info stores the
// clip's mp3 here as `sourceAudioUrl`; the filename is exactly the clip id.
const SUNO_CDN_BASE = "https://cdn1.suno.ai";

/**
 * Resolve the best playable audio URL for a raw Suno clip.
 *
 * Precedence mirrors refresh.ts (single source of truth for this whitelist):
 *   sourceAudioUrl (cdn1.suno.ai, permanent) → source_audio_url →
 *   audio_url (tempfile CDN, expires) → audioUrl
 *
 * Last resort: the aggregator has been observed returning status=SUCCESS with
 * every URL field null while the clip id is present and the mp3 is live at
 * cdn1.suno.ai/<id>.mp3 (verified 2026-07-08 — 4 "ready" songs with audioUrl
 * null). Derive that permanent URL from the id so a completed clip is never
 * left unplayable. `streamAudioUrl` is intentionally NOT a fallback: it 200s
 * with zero bytes.
 */
export function resolveClipAudioUrl(raw: Record<string, unknown>): string {
  const direct =
    (raw.sourceAudioUrl as string) ||
    (raw.source_audio_url as string) ||
    (raw.audio_url as string) ||
    (raw.audioUrl as string);
  if (direct) return direct;
  const id = (raw.id as string) || (raw.audioId as string) || "";
  return id ? `${SUNO_CDN_BASE}/${encodeURIComponent(id)}.mp3` : "";
}

export function applyStyleTuning(body: Record<string, unknown>, opts: StyleTuningOptions): void {
  if (opts.personaId != null) body.personaId = opts.personaId;
  if (opts.personaModel != null) body.personaModel = opts.personaModel;
  if (opts.negativeTags != null) body.negativeTags = opts.negativeTags;
  if (opts.vocalGender != null) body.vocalGender = opts.vocalGender;
  if (opts.styleWeight != null) body.styleWeight = opts.styleWeight;
  if (opts.weirdnessConstraint != null) body.weirdnessConstraint = opts.weirdnessConstraint;
  if (opts.audioWeight != null) body.audioWeight = opts.audioWeight;
}

export function mapRawSong(raw: Record<string, unknown>): SunoSong {
  return {
    id: (raw.id as string) ?? "",
    title: (raw.title as string) ?? "",
    prompt: (raw.prompt as string) ?? "",
    tags: (raw.tags as string) ?? undefined,
    audioUrl: resolveClipAudioUrl(raw),
    streamAudioUrl: (raw.stream_audio_url as string) ?? (raw.streamAudioUrl as string) ?? undefined,
    imageUrl: (raw.image_url as string) ?? (raw.imageUrl as string) ?? undefined,
    duration: (raw.duration as number) ?? undefined,
    status: "pending",
    model: (raw.model_name as string) ?? (raw.modelName as string) ?? undefined,
    lyrics: (raw.prompt as string) ?? undefined,
    createdAt: (raw.createTime as string) ?? (raw.createdAt as string) ?? new Date().toISOString(),
  };
}

export function taskStatusToSongStatus(status: TaskStatus): SongStatus {
  if (status === "SUCCESS") return "complete";
  if (isTerminalFailure(status)) return "error";
  return "pending";
}
