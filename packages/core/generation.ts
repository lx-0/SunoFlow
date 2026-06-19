import { z } from "zod";

// Shared song-generation contract — the single definition of the /api/generate
// request body and the generation-status vocabulary, used by the web route
// (server-side validation) AND the mobile client (request typing + pre-send
// validation). Pure zod / constants, no platform deps.

// ── Suno models + their real prompt limits (single source of truth) ─────────
// These are the actual per-model lyric/prompt character ceilings enforced by
// sunoapi.org. The server's validatePrompt enforces the exact per-model value;
// the /api/generate request schema and the web + mobile lyrics fields all key
// off the DEFAULT model below, so no layer ever caps under what the API accepts.
// Anything Suno-version-related (here, the sunoapi validation layer, and the
// clients) MUST derive from this — do not hardcode the numbers elsewhere.

export const SUNO_MODELS = ["V4", "V4_5", "V4_5PLUS", "V4_5ALL", "V5", "V5_5"] as const;
export type SunoModel = (typeof SUNO_MODELS)[number];

export const DEFAULT_SUNO_MODEL: SunoModel = "V5_5";

export const SUNO_PROMPT_LIMIT_BY_MODEL: Record<SunoModel, number> = {
  V4: 3000,
  V4_5: 5000,
  V4_5PLUS: 5000,
  V4_5ALL: 5000,
  V5: 5000,
  V5_5: 5000,
};

// ── Field limits + messages (single source of truth) ───────────────────────

// Derived from the default model's real Suno limit (V5_5 → 5000) so the request
// schema + UI fields never reject lyrics the API would actually accept.
export const GENERATION_PROMPT_MAX_LENGTH = SUNO_PROMPT_LIMIT_BY_MODEL[DEFAULT_SUNO_MODEL];
export const GENERATION_TITLE_MAX_LENGTH = 200;
export const GENERATION_STYLE_MAX_LENGTH = 500;

export const GENERATION_PROMPT_REQUIRED_MESSAGE = "A style/genre prompt is required";
export const GENERATION_PROMPT_MAX_MESSAGE = `Prompt must be ${GENERATION_PROMPT_MAX_LENGTH} characters or less`;
export const GENERATION_TITLE_MAX_MESSAGE = `Title must be ${GENERATION_TITLE_MAX_LENGTH} characters or less`;
export const GENERATION_STYLE_MAX_MESSAGE = `Style must be ${GENERATION_STYLE_MAX_LENGTH} characters or less`;
export const GENERATION_TAGS_MAX_MESSAGE = `Tags must be ${GENERATION_STYLE_MAX_LENGTH} characters or less`;

// Batch generation bounds (shared by the web batch validator + mobile picker).
export const MIN_BATCH_SIZE = 2;
export const MAX_BATCH_SIZE = 5;

// ── /api/generate request body ─────────────────────────────────────────────

export const generateSongRequestSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(1, GENERATION_PROMPT_REQUIRED_MESSAGE)
    .max(GENERATION_PROMPT_MAX_LENGTH, GENERATION_PROMPT_MAX_MESSAGE),
  title: z.string().max(GENERATION_TITLE_MAX_LENGTH, GENERATION_TITLE_MAX_MESSAGE).optional(),
  tags: z.string().max(GENERATION_STYLE_MAX_LENGTH, GENERATION_TAGS_MAX_MESSAGE).optional(),
  makeInstrumental: z.boolean().optional(),
  personaId: z.string().optional(),
  parentSongId: z.string().optional(),
});

export type GenerateSongRequest = z.infer<typeof generateSongRequestSchema>;

// ── Generation status vocabulary ───────────────────────────────────────────
// The DB-backed `Song.generationStatus` lifecycle states. Terminal states are
// `ready` and `failed`; anything else means polling should continue.

export const GENERATION_STATUS = {
  PENDING: "pending",
  PROCESSING: "processing",
  READY: "ready",
  FAILED: "failed",
} as const;

export type GenerationStatus = (typeof GENERATION_STATUS)[keyof typeof GENERATION_STATUS];

export const GENERATION_TERMINAL_STATUSES: readonly GenerationStatus[] = [
  GENERATION_STATUS.READY,
  GENERATION_STATUS.FAILED,
];

/** True once the song has reached a terminal generation state (ready | failed). */
export function isTerminalGenerationStatus(status: string | null | undefined): boolean {
  return status === GENERATION_STATUS.READY || status === GENERATION_STATUS.FAILED;
}
