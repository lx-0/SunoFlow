/**
 * Client-side fetch wrapper with configurable timeout.
 * Throws a TypeError with `name === "TimeoutError"` when the request times out.
 */
export const DEFAULT_CLIENT_TIMEOUT_MS = 15_000;

export class FetchTimeoutError extends Error {
  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs / 1000}s`);
    this.name = "FetchTimeoutError";
    Object.setPrototypeOf(this, FetchTimeoutError.prototype);
  }
}

export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: RequestInit,
  timeoutMs = DEFAULT_CLIENT_TIMEOUT_MS
): Promise<Response> {
  const timeoutController = new AbortController();
  const timeoutId = setTimeout(() => timeoutController.abort(), timeoutMs);

  const externalSignal = init?.signal as AbortSignal | undefined;
  const signal =
    externalSignal
      ? AbortSignal.any([timeoutController.signal, externalSignal])
      : timeoutController.signal;

  try {
    const res = await fetch(input, { ...init, signal });
    return res;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      // Re-throw as-is if the caller's signal aborted so callers can detect it
      if (externalSignal?.aborted) throw err;
      throw new FetchTimeoutError(timeoutMs);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Returns a user-friendly error message for common client-side fetch failures.
 */
export function clientFetchErrorMessage(err: unknown): string {
  if (err instanceof FetchTimeoutError) {
    return "Request timed out. Please check your connection and try again.";
  }
  if (err instanceof TypeError && (err.message.includes("fetch") || err.message.includes("network") || err.message.includes("Failed to fetch"))) {
    return "Network error. Please check your connection and try again.";
  }
  return "Something went wrong. Please try again.";
}
