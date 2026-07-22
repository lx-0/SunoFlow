/**
 * Client-safe jam-session API helpers. Deliberately OUTSIDE the server-only
 * `@/lib/jam` barrel (which imports prisma) — only type-only imports cross
 * that boundary; they are erased at build time.
 */
import { fetchWithTimeout } from "@/lib/fetch-client";
import type { JamSessionState } from "@/lib/jam/state";
import type { JamSessionSummary } from "@/lib/jam/sessions";

export type JamSessionDetail = JamSessionSummary & { name: string };

type ClientResult<T> = ({ ok: true } & T) | { ok: false; error: string };

async function parseError(res: Response): Promise<string> {
  try {
    const json = (await res.json()) as { error?: unknown };
    if (typeof json.error === "string" && json.error) return json.error;
  } catch {
    // fall through to the generic message
  }
  return `Request failed (${res.status})`;
}

export async function createJamSessionApi(input: {
  name?: string;
  budgetTotal?: number;
}): Promise<ClientResult<{ session: JamSessionDetail }>> {
  const res = await fetchWithTimeout("/api/jam-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  if (!res.ok) return { ok: false, error: await parseError(res) };
  const json = (await res.json()) as { session: JamSessionDetail };
  return { ok: true, session: json.session };
}

export async function fetchJamSessionDetail(
  sessionId: string,
): Promise<ClientResult<{ session: JamSessionDetail }>> {
  const res = await fetchWithTimeout(`/api/jam-sessions/${sessionId}`);
  if (!res.ok) return { ok: false, error: await parseError(res) };
  const json = (await res.json()) as { session: JamSessionDetail };
  return { ok: true, session: json.session };
}

export async function fetchJamState(
  shareToken: string,
): Promise<ClientResult<{ state: JamSessionState }>> {
  const res = await fetchWithTimeout(`/api/jam/${shareToken}`);
  if (!res.ok) return { ok: false, error: await parseError(res) };
  const state = (await res.json()) as JamSessionState;
  return { ok: true, state };
}

export async function vetoJamEntryApi(
  sessionId: string,
  entryId: string,
): Promise<ClientResult<Record<never, never>>> {
  const res = await fetchWithTimeout(
    `/api/jam-sessions/${sessionId}/entries/${entryId}`,
    { method: "DELETE" },
  );
  if (!res.ok) return { ok: false, error: await parseError(res) };
  return { ok: true };
}

export async function closeJamSessionApi(
  sessionId: string,
): Promise<ClientResult<Record<never, never>>> {
  const res = await fetchWithTimeout(`/api/jam-sessions/${sessionId}/close`, {
    method: "POST",
  });
  if (!res.ok) return { ok: false, error: await parseError(res) };
  return { ok: true };
}
