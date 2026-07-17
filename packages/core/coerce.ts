// Pure, framework-agnostic coercion helpers for untrusted JSON payloads (API
// responses, JSON columns, LLM output). Consolidates the defensive boundary-
// mapping idiom used across the mobile api/* modules: strict typeof checks,
// empty strings treated as absent, finite numbers only, `=== true` booleans —
// never implicit casts. Safe to import from any client bundle.

/**
 * String coercion. Empty strings count as absent (matches the boundary-map
 * idiom: `typeof v === "string" && v`). Returns `fallback` (default null)
 * for anything else.
 */
export function asString(v: unknown): string | null;
export function asString(v: unknown, fallback: string): string;
export function asString(v: unknown, fallback?: string): string | null {
  return typeof v === "string" && v ? v : fallback ?? null;
}

/**
 * Finite-number coercion — NaN/Infinity and numeric strings do NOT pass.
 * Returns `fallback` (default null) for anything else; 0 is a valid value.
 */
export function asNumber(v: unknown): number | null;
export function asNumber(v: unknown, fallback: number): number;
export function asNumber(v: unknown, fallback?: number): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback ?? null;
}

/** Strict boolean coercion — truthy strings/numbers fall back (default false). */
export function asBool(v: unknown, fallback = false): boolean {
  return typeof v === "boolean" ? v : fallback;
}

/**
 * Object guard for keyed access on unknown JSON. Mirrors the existing
 * `v && typeof v === "object"` guards (arrays pass; key reads on them simply
 * degrade to undefined). Returns null for primitives and null/undefined.
 */
export function asRecord(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" ? (v as Record<string, unknown>) : null;
}

/** Keeps only non-empty string elements; non-arrays degrade to []. */
export function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.filter((x): x is string => typeof x === "string" && x.length > 0);
}

/**
 * Unwraps the `{ [key]: unknown[] }` list-envelope used by the REST endpoints
 * and maps each row defensively — rows the mapper rejects (null) are dropped.
 * Non-object roots, missing keys, and non-array values all degrade to [].
 */
export function unwrapList<T>(raw: unknown, key: string, map: (row: unknown) => T | null): T[] {
  const list = asRecord(raw)?.[key];
  if (!Array.isArray(list)) return [];
  const out: T[] = [];
  for (const row of list) {
    const mapped = map(row);
    if (mapped !== null) out.push(mapped);
  }
  return out;
}
