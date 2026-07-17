import { asNumber, asRecord, asString } from "@sunoflow/core";
import { apiGet } from "./client";

// Read-only rate-limit status. The web route `/api/rate-limit` returns a single
// RateLimitStatus object for the *generate* action:
//   { remaining: number; limit: number; resetAt: string }  (resetAt is ISO).
// It is NOT a map/array — there is one limit surfaced here. We normalize it into
// an array of display rows so the screen can render uniformly and so a future
// multi-limit envelope (array, or object-keyed-by-action) degrades gracefully
// instead of throwing. Everything is shape-guarded at the data boundary.

export interface RateLimit {
  key: string;
  label: string;
  limit: number;
  remaining: number;
  resetAt: string | null;
}

const ACTION_LABELS: Record<string, string> = {
  generate: "Song Generations",
  lyrics_generate: "Lyrics Generations",
  download: "Downloads",
  report: "Reports",
  password_reset: "Password Resets",
  verification_email: "Verification Emails",
  search: "Searches",
};

function labelFor(key: string): string {
  if (ACTION_LABELS[key]) return ACTION_LABELS[key];
  // Fallback: turn snake/kebab case into Title Case.
  const words = key.replace(/[_-]+/g, " ").trim();
  if (!words) return "Rate Limit";
  return words.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Map one status-shaped object → a RateLimit row, or null if it's not usable
// (missing the numeric limit/remaining pair).
function mapRow(key: string, raw: unknown): RateLimit | null {
  const r = asRecord(raw);
  if (!r) return null;
  const limit = asNumber(r.limit);
  const remaining = asNumber(r.remaining);
  if (limit === null || remaining === null) return null;
  return {
    key,
    label: labelFor(key),
    limit,
    remaining: Math.max(0, Math.min(remaining, limit)),
    resetAt: asString(r.resetAt),
  };
}

export async function fetchRateLimits(): Promise<RateLimit[]> {
  const res = await apiGet<unknown>("/api/rate-limit");

  // Defensive normalization across plausible shapes:
  // 1. array of status rows (each may carry its own `key`/`action`)
  if (Array.isArray(res)) {
    return res
      .map((raw, i) => {
        const r = asRecord(raw) ?? {};
        const key = asString(r.key) ?? asString(r.action) ?? `limit_${i}`;
        return mapRow(key, raw);
      })
      .filter((row): row is RateLimit => row !== null);
  }

  const obj = asRecord(res);
  if (obj) {
    // 2. the current single-object shape: { remaining, limit, resetAt }
    if ("limit" in obj && "remaining" in obj) {
      const row = mapRow("generate", obj);
      return row ? [row] : [];
    }
    // 3. object keyed by action: { generate: {...}, download: {...} }
    return Object.entries(obj)
      .map(([key, raw]) => mapRow(key, raw))
      .filter((row): row is RateLimit => row !== null);
  }

  return [];
}
