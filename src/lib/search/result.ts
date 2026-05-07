export type SearchResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string; status: number };

export function success<T>(data: T): SearchResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  error: string,
  code: string,
  status: number,
): SearchResult<T> {
  return { ok: false, error, code, status };
}

export const Err = {
  validation: (msg: string) => fail(msg, "VALIDATION_ERROR", 400),
  rateLimited: (msg: string) => fail(msg, "RATE_LIMITED", 429),
};
