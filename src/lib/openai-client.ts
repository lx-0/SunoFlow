import OpenAI from "openai";
import { OPENAI_API_KEY } from "@/lib/env";

/**
 * Per-request timeout in ms. The SDK default is 10 minutes, which — combined
 * with automatic retries — can block the sequential feed-cron loop for tens of
 * minutes on a single stalled completion. A short cap keeps a hung upstream
 * from starving the loop; the caller layers an AbortController deadline on top.
 */
export const OPENAI_CLIENT_TIMEOUT_MS = 30_000;

/**
 * Retry budget. The default is 2 (up to 3 attempts). Text generation here is
 * best-effort and callers already tolerate `null`, so one retry is plenty and
 * bounds the worst-case wall-clock spent per request.
 */
export const OPENAI_CLIENT_MAX_RETRIES = 1;

/**
 * Shared OpenAI client factory.
 */
export function getOpenAIClient(): OpenAI {
  if (!OPENAI_API_KEY) {
    throw new Error(
      "OPENAI_API_KEY is not set. Add it to your .env file to enable OpenAI features."
    );
  }
  return new OpenAI({
    apiKey: OPENAI_API_KEY,
    timeout: OPENAI_CLIENT_TIMEOUT_MS,
    maxRetries: OPENAI_CLIENT_MAX_RETRIES,
  });
}
