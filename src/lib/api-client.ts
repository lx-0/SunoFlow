import { HttpError, createJsonClient } from "@sunoflow/core";
import { fetchWithTimeout } from "./fetch-client";

// Thin adapter over the shared @sunoflow/core JSON client. HttpError is the
// SAME class QueryProvider re-exports, so react-query's instanceof retry checks
// keep matching. fetchWithTimeout is injected as the platform fetch; URLs stay
// relative (same-origin cookie auth).

const client = createJsonClient({ fetch: fetchWithTimeout });

export const apiGet = <T>(url: string): Promise<T> => client.get<T>(url);
export const apiPost = <T>(url: string, body: unknown): Promise<T> => client.post<T>(url, body);
export const apiDelete = (url: string, body?: unknown): Promise<void> => client.del(url, body);
export const apiPatch = <T>(url: string, body: unknown): Promise<T> => client.patch<T>(url, body);

async function parseJsonSafe<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

// PUT is not part of the shared JsonClient verb set; kept as a local sibling
// with the identical error contract.
export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status, (await parseJsonSafe<{ error?: string }>(res)).error);
  return parseJsonSafe<T>(res);
}
