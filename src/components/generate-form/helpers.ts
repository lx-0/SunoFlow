import { GENERATION_PROMPT_MAX_LENGTH } from "@sunoflow/core";
import type { RateLimitMeta, RateLimitStatus } from "./types";

// Single source of truth (@sunoflow/core) — the default model's real Suno limit.
// The server's validatePrompt still enforces the exact per-model limit.
const PROMPT_LIMIT = GENERATION_PROMPT_MAX_LENGTH;

export function getPromptValidationError(promptValue: string, customMode: boolean): string | null {
  if (!promptValue.trim()) {
    return customMode ? "Lyrics are required" : "Style / genre is required";
  }

  if (promptValue.length > PROMPT_LIMIT) {
    return `Prompt must be ${PROMPT_LIMIT} characters or less`;
  }

  return null;
}

type QueueStatus = "pending" | "processing" | "done" | "failed" | "cancelled";
type ReorderPendingIndexInput = number | QueueStatus | undefined;

function normalizePendingIndex(input: ReorderPendingIndexInput): number {
  if (typeof input === "number") return input;
  if (input === "processing") return 1;
  return 0;
}

export function reorderPendingQueueIds(
  pendingIds: string[],
  pendingIndex: ReorderPendingIndexInput,
  direction: "up" | "down",
): string[] {
  const index = normalizePendingIndex(pendingIndex);
  const nextIds = [...pendingIds];

  if (direction === "up") {
    if (index <= 0) return nextIds;
    [nextIds[index - 1], nextIds[index]] = [nextIds[index], nextIds[index - 1]];
    return nextIds;
  }

  if (index < 0 || index >= nextIds.length - 1) return nextIds;
  [nextIds[index], nextIds[index + 1]] = [nextIds[index + 1], nextIds[index]];
  return nextIds;
}

export function getSubmitPrompt(customMode: boolean, prompt: string, style: string): string {
  return (customMode ? prompt : style).trim();
}

export function getPendingIndexFromVisualIndex(
  visualIndex: number,
  firstActiveStatus: "processing" | "pending" | undefined,
): number {
  return visualIndex - (firstActiveStatus === "processing" ? 1 : 0);
}

export function getRateLimitMeta(rateLimit: RateLimitStatus): RateLimitMeta {
  const used = rateLimit.limit - rateLimit.remaining;
  const pct = rateLimit.limit > 0 ? Math.round((used / rateLimit.limit) * 100) : 0;
  const barColor = pct >= 100 ? "bg-red-500" : pct >= 80 ? "bg-yellow-500" : "bg-green-500";
  const minsLeft = Math.max(0, Math.ceil((new Date(rateLimit.resetAt).getTime() - Date.now()) / 60000));
  const isAtLimit = rateLimit.remaining === 0;

  return {
    used,
    pct,
    barColor,
    minsLeft,
    isAtLimit,
    isNearLimit: pct >= 80 && !isAtLimit,
  };
}
