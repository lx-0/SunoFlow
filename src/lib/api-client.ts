import { HttpError } from "@/components/QueryProvider";
import { fetchWithTimeout } from "./fetch-client";

async function parseJsonSafe<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

export async function apiGet<T>(url: string): Promise<T> {
  const res = await fetchWithTimeout(url);
  if (!res.ok) throw new HttpError(res.status);
  return parseJsonSafe<T>(res);
}

export async function apiPost<T>(url: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status, (await parseJsonSafe<{ error?: string }>(res)).error);
  return parseJsonSafe<T>(res);
}

export async function apiDelete(url: string): Promise<void> {
  const res = await fetchWithTimeout(url, { method: "DELETE" });
  if (!res.ok) throw new HttpError(res.status, (await parseJsonSafe<{ error?: string }>(res)).error);
}

export async function apiPatch<T>(url: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status, (await parseJsonSafe<{ error?: string }>(res)).error);
  return parseJsonSafe<T>(res);
}

export async function apiPut<T>(url: string, body: unknown): Promise<T> {
  const res = await fetchWithTimeout(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new HttpError(res.status, (await parseJsonSafe<{ error?: string }>(res)).error);
  return parseJsonSafe<T>(res);
}
