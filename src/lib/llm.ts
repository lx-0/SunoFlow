import { logServerError } from "@/lib/error-logger";
import { logger } from "@/lib/logger";
import { getOpenAIClient } from "@/lib/openai-client";
import { OPENAI_MODEL } from "@/lib/env";

/**
 * Hard wall-clock deadline for a single completion, enforced via an
 * AbortController. This bounds the whole request — including the SDK's internal
 * retries — independent of the client-level socket timeout, so a silently
 * stalled upstream cannot block the sequential feed-cron loop.
 */
export const LLM_REQUEST_DEADLINE_MS = 45_000;

// Content-policy rejections are user-content problems, not infrastructure
// failures — they are expected noise and must not page GlitchTip. Mirrors the
// filter approach in src/lib/generation/song-completion.ts (kept local here so
// this module stays free of the generation/prisma dependency graph).
const CONTENT_REJECT_PATTERNS = [
  /content policy/i,
  /content_policy/i,
  /copyright/i,
  /artist name/i,
  /please change your/i,
  /safety system/i,
];

function isContentReject(message: string): boolean {
  return CONTENT_REJECT_PATTERNS.some((re) => re.test(message));
}

/**
 * Generate text using OpenAI's chat completions API.
 *
 * @param systemPrompt - Instructions for the model's behavior
 * @param userPrompt - The user's input/request
 * @returns The generated text, or null if generation fails
 *
 * @example
 * ```ts
 * const lyrics = await generateText(
 *   "You are a songwriter. Write lyrics for the given theme.",
 *   "Write a verse about ocean waves"
 * );
 * ```
 */
export async function generateText(
  systemPrompt: string,
  userPrompt: string
): Promise<string | null> {
  const client = getOpenAIClient();
  const model = OPENAI_MODEL;

  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), LLM_REQUEST_DEADLINE_MS);

  try {
    const response = await client.chat.completions.create(
      {
        model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      },
      { signal: controller.signal },
    );

    return response.choices[0]?.message?.content ?? null;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    // Noise-grade content rejections stay out of error tracking: they are
    // caused by user input, not by a broken dependency.
    if (isContentReject(message)) {
      logger.warn({ message }, "llm: content rejected by upstream (not tracked)");
      return null;
    }

    // Genuine API/network/timeout failures: surface to GlitchTip. Callers only
    // see `null`, so without this the failure would be invisible.
    logServerError("llm", error, { route: "lib/llm.generateText" });
    return null;
  } finally {
    // Clear the timer and release any lingering socket read. Aborting after a
    // successful response is a harmless no-op.
    clearTimeout(deadline);
    controller.abort();
  }
}
