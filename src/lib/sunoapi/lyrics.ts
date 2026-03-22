import type { GenerateLyricsOptions, LyricsResult, TimestampedLyricsResult } from "./types";
import { SunoApiError, BASE_URL, NOOP_CALLBACK_URL, fetchWithRetry, buildHeaders, extractTaskId } from "./http";

/**
 * Generate lyrics from a text description (max 200 chars).
 * Returns a taskId — poll with getTaskStatus() to get the lyrics.
 */
export async function generateLyrics(
  options: GenerateLyricsOptions,
  apiKey?: string
): Promise<LyricsResult> {
  const body = {
    prompt: options.prompt,
    callBackUrl: NOOP_CALLBACK_URL,
  };

  const res = await fetchWithRetry(`${BASE_URL}/lyrics`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify(body),
  });

  const taskId = await extractTaskId(res, "lyrics API");
  return { taskId };
}

/**
 * Get timestamped (word-level synchronized) lyrics for a generated track.
 */
export async function getTimestampedLyrics(
  taskId: string,
  audioId: string,
  apiKey?: string
): Promise<TimestampedLyricsResult> {
  const res = await fetchWithRetry(`${BASE_URL}/generate/get-timestamped-lyrics`, {
    method: "POST",
    headers: buildHeaders(apiKey),
    body: JSON.stringify({ taskId, audioId }),
  });

  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: TimestampedLyricsResult;
  };

  if (!json.data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in timestamped lyrics response");
  }

  return json.data;
}
