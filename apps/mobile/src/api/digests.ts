import { inspirationDigestSchema, isDigestFromToday, type InspirationDigest } from "@sunoflow/core";
import { apiGet, apiPost } from "./client";

// "Today's Picks" — auto-curated RSS-derived prompt ideas. The digest contract is
// shared with the web app via @sunoflow/core (digestItemSchema / inspirationDigestSchema).

function parseDigest(raw: unknown): InspirationDigest | null {
  const parsed = inspirationDigestSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

/**
 * GET /api/digests?limit=1 → latest digest, but only if it was created today
 * (matches the web's "Today's Picks" gating). Returns null otherwise.
 */
export async function fetchTodaysPicks(now: Date): Promise<InspirationDigest | null> {
  const data = await apiGet<{ digests?: unknown[] }>("/api/digests?limit=1");
  const latest = parseDigest(data.digests?.[0]);
  if (!latest) return null;
  return isDigestFromToday(latest.createdAt, now) ? latest : null;
}

/** POST /api/digests/generate → freshly curated digest (requires RSS feeds). */
export async function generateTodaysPicks(): Promise<InspirationDigest | null> {
  const data = await apiPost<{ digest?: unknown }>("/api/digests/generate", {});
  return parseDigest(data.digest);
}
