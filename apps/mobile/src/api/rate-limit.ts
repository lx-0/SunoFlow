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

function readNumber(raw: unknown): number | null {
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function readResetAt(raw: unknown): string | null {
  return typeof raw === "string" && raw ? raw : null;
}

// Map one status-shaped object → a RateLimit row, or null if it's not usable
// (missing the numeric limit/remaining pair).
function mapRow(key: string, raw: unknown): RateLimit | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  const limit = readNumber(r.limit);
  const remaining = readNumber(r.remaining);
  if (limit === null || remaining === null) return null;
  return {
    key,
    label: labelFor(key),
    limit,
    remaining: Math.max(0, Math.min(remaining, limit)),
    resetAt: readResetAt(r.resetAt),
  };
}

export async function fetchRateLimits(): Promise<RateLimit[]> {
  const res = await apiGet<unknown>("/api/rate-limit");

  // Defensive normalization across plausible shapes:
  // 1. array of status rows (each may carry its own `key`/`action`)
  if (Array.isArray(res)) {
    return res
      .map((raw, i) => {
        const r = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const key =
          (typeof r.key === "string" && r.key) ||
          (typeof r.action === "string" && r.action) ||
          `limit_${i}`;
        return mapRow(key, raw);
      })
      .filter((row): row is RateLimit => row !== null);
  }

  if (res && typeof res === "object") {
    const obj = res as Record<string, unknown>;
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
