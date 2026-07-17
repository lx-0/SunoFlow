import { asBool, asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

// API key settings, ported from the web's settings/api-key-sections.tsx. Two
// concerns share this module:
//   1. The BYO Suno API key + "use personal API key" toggle
//      (GET/PATCH /api/profile/api-key).
//   2. Personal API keys for programmatic access to the SunoFlow account
//      (GET/POST/DELETE /api/profile/api-keys).
// Both endpoints are authDataRoute/authRoute handlers that accept the bearer
// sk- key and return their payload directly (no envelope). Map defensively —
// never throw on shape.

// ---------------------------------------------------------------------------
// Suno API key (BYO)
// ---------------------------------------------------------------------------

export interface SunoKeyState {
  /**
   * The current Suno key as a display hint. The GET route returns a MASKED
   * value (`maskedKey`, e.g. "abcd…wxyz"), never the real secret — treat it
   * as a placeholder only, never as the actual key.
   */
  sunoApiKey: string | null;
  usePersonalApiKey: boolean;
}

interface SunoKeyResponse {
  hasKey?: boolean;
  maskedKey?: string | null;
  usePersonalApiKey?: boolean;
}

/** Current Suno key state. `sunoApiKey` is the masked display hint, not the secret. */
export async function fetchSunoKey(): Promise<SunoKeyState> {
  const res = await apiGet<SunoKeyResponse>(`/api/profile/api-key`);
  return {
    sunoApiKey: asString(res?.maskedKey),
    usePersonalApiKey: asBool(res?.usePersonalApiKey),
  };
}

/** Toggle whether the user's personal Suno key is used instead of the shared app key. */
export async function setUsePersonalKey(use: boolean): Promise<void> {
  await apiPatch(`/api/profile/api-key`, { usePersonalApiKey: use });
}

/** Store (or, with an empty string, clear) the user's personal Suno API key. */
export async function setSunoApiKey(key: string): Promise<void> {
  await apiPatch(`/api/profile/api-key`, { sunoApiKey: key.trim() });
}

// ---------------------------------------------------------------------------
// Personal API keys (programmatic access)
// ---------------------------------------------------------------------------

export interface PersonalKey {
  id: string;
  name: string;
}

function mapPersonalKey(raw: unknown): PersonalKey | null {
  const k = asRecord(raw);
  const id = k ? asString(k.id) : null;
  const name = k ? asString(k.name) : null;
  if (!id || !name) return null;
  return { id, name };
}

/** List the user's active personal API keys. */
export async function fetchPersonalKeys(): Promise<PersonalKey[]> {
  const res = await apiGet<unknown>(`/api/profile/api-keys`);
  return unwrapList(res, "keys", mapPersonalKey);
}

/**
 * Create a personal API key. The POST response includes the secret ONCE in the
 * `key` field — surface it to the user immediately; it cannot be retrieved again.
 */
export async function createPersonalKey(name: string): Promise<{ secret: string | null }> {
  const res = await apiPost<{ key?: unknown }>(`/api/profile/api-keys`, { name: name.trim() });
  return { secret: asString(res?.key) };
}

/** Revoke (delete) a personal API key. */
export async function deletePersonalKey(id: string): Promise<void> {
  await apiDelete(`/api/profile/api-keys/${id}`);
}
