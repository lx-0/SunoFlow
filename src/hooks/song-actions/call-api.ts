"use client";

import { type ToastFn } from "@/components/Toast";

/**
 * Fetches a JSON API endpoint, parses the response, and calls toast on error.
 * Returns the parsed data on success, or null on failure (toast already fired).
 */
export async function callApi<T = Record<string, unknown>>(
  url: string,
  options: RequestInit,
  toast: ToastFn,
  errorMessage: string,
): Promise<T | null> {
  const res = await fetch(url, options);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    toast((data as { error?: string }).error ?? errorMessage, "error");
    return null;
  }
  return data as T;
}

export function jsonPost(body: unknown): RequestInit {
  return {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}

export function jsonPatch(body: unknown): RequestInit {
  return {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  };
}
