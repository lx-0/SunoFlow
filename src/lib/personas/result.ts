export type PersonaResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code: string; status: number };

export function success<T>(data: T): PersonaResult<T> {
  return { ok: true, data };
}

export function fail<T = never>(
  error: string,
  code: string,
  status: number,
): PersonaResult<T> {
  return { ok: false, error, code, status };
}

export const Err = {
  notFound: (msg = "Not found") => fail(msg, "NOT_FOUND", 404),
  validation: (msg: string) => fail(msg, "VALIDATION_ERROR", 400),
  clipNotFound: (msg: string) => fail(msg, "CLIP_NOT_FOUND", 404),
  limitReached: (msg: string) => fail(msg, "VALIDATION_ERROR", 400),
  upstream: (msg: string, status: number) => fail(msg, "SUNO_API_ERROR", status),
};
