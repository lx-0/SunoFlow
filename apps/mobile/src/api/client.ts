import { HttpError, createJsonClient } from "@sunoflow/core";
import { getApiKey } from "@/auth/session";

// Bearer-auth API client for the native app: a thin adapter over the shared
// @sunoflow/core JSON client (same HttpError class + { error } failure-envelope
// contract as the web's src/lib/api-client.ts), swapping implicit cookie auth
// for an Authorization header resolved per-request from the stored sk- key.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_SUNOFLOW_BASE_URL ?? "https://sunoflow.app";

// Re-exported so sibling api/* modules and screens keep importing from "./client".
export { HttpError };

async function authHeaders(): Promise<Record<string, string>> {
  const key = await getApiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

const client = createJsonClient({
  // Wrapped so the global fetch is never invoked unbound (illegal on some runtimes).
  fetch: (url, init) => fetch(url, init),
  baseUrl: API_BASE_URL,
  headers: authHeaders,
});

export const apiGet = <T>(path: string) => client.get<T>(path);
export const apiPost = <T>(path: string, body: unknown) => client.post<T>(path, body);
export const apiPatch = <T>(path: string, body: unknown) => client.patch<T>(path, body);
export const apiDelete = (path: string, body?: unknown) => client.del(path, body);
