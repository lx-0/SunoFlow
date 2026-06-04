import { z } from "zod";

// Shared song-generation contract — the single definition of the /api/generate
// request body and the generation-status vocabulary, used by the web route
// (server-side validation) AND the mobile client (request typing + pre-send
// validation). Pure zod / constants, no platform deps.

// ── Field limits + messages (single source of truth) ───────────────────────

export const GENERATION_PROMPT_MAX_LENGTH = 3000;
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
