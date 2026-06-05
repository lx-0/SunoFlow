import { getApiKey } from "@/auth/session";

// Bearer-auth API client for the native app. Ported from the web app's
// src/lib/api-client.ts, swapping implicit cookie auth for an Authorization
// header. Points at the SunoFlow backend; talks to the M004-S02 bearer routes.
//
// NOTE: shares contract with the web REST API (/api, /api/v1). When the monorepo
// lands, the zod schemas + types behind these calls move to packages/core and are
// imported here instead of being re-declared.

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_SUNOFLOW_BASE_URL ?? "https://sunoflow.app";

export class HttpError extends Error {
  constructor(public status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  const key = await getApiKey();
  return key ? { Authorization: `Bearer ${key}` } : {};
}

async function parseJsonSafe<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(await authHeaders()),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new HttpError(res.status, (await parseJsonSafe<{ error?: string }>(res)).error);
  }
  return parseJsonSafe<T>(res);
}

export const apiGet = <T>(path: string) => request<T>(path);
export const apiPost = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "POST", body: JSON.stringify(body) });
export const apiPatch = <T>(path: string, body: unknown) =>
  request<T>(path, { method: "PATCH", body: JSON.stringify(body) });
export const apiDelete = (path: string, body?: unknown) =>
  request<void>(path, { method: "DELETE", ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
