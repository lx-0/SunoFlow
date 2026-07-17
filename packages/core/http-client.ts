import { asRecord, asString } from "./coerce";

// Framework-agnostic JSON HTTP client shared by the web (root) and mobile
// (apps/mobile) API layers. No React/Next/Expo imports — the platform fetch
// (plain fetch, fetchWithTimeout, …) is injected. Encodes the SunoFlow REST
// failure-envelope contract: non-2xx responses carry { error?: string } and
// throw HttpError(status, error); bodies that fail to parse (empty 204s,
// HTML error pages) degrade to {} instead of throwing.

/** Structural subset of Response — enough for JSON APIs, trivial to fake in tests. */
export interface JsonResponseLike {
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}

export interface JsonRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Structural subset of fetch — real fetch and fetchWithTimeout both satisfy it. */
export type FetchLike = (url: string, init?: JsonRequestInit) => Promise<JsonResponseLike>;

/** Static headers or a per-request (possibly async) provider — e.g. bearer auth. */
export type HeadersProvider =
  | Record<string, string>
  | (() => Record<string, string> | Promise<Record<string, string>>);

// Twin of the web HttpError (src/components/QueryProvider.tsx) — status carries
// the HTTP code so react-query retry logic can skip 4xx.
export class HttpError extends Error {
  constructor(public readonly status: number, message?: string) {
    super(message ?? `HTTP ${status}`);
    this.name = "HttpError";
    Object.setPrototypeOf(this, HttpError.prototype);
  }
}

export interface JsonClientOptions {
  fetch: FetchLike;
  baseUrl?: string;
  headers?: HeadersProvider;
}

export interface JsonClient {
  get<T>(path: string): Promise<T>;
  post<T>(path: string, body?: unknown): Promise<T>;
  patch<T>(path: string, body?: unknown): Promise<T>;
  del(path: string, body?: unknown): Promise<void>;
}

async function parseJsonSafe<T>(res: JsonResponseLike): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    return {} as T;
  }
}

export function createJsonClient(options: JsonClientOptions): JsonClient {
  const { fetch: doFetch, baseUrl = "", headers } = options;

  async function resolveHeaders(): Promise<Record<string, string>> {
    if (!headers) return {};
    return typeof headers === "function" ? await headers() : headers;
  }

  async function request<T>(path: string, method?: string, body?: unknown): Promise<T> {
    const hasBody = body !== undefined;
    const res = await doFetch(`${baseUrl}${path}`, {
      ...(method ? { method } : {}),
      headers: {
        ...(hasBody ? { "Content-Type": "application/json" } : {}),
        ...(await resolveHeaders()),
      },
      ...(hasBody ? { body: JSON.stringify(body) } : {}),
    });
    if (!res.ok) {
      const parsed = await parseJsonSafe<unknown>(res);
      throw new HttpError(res.status, asString(asRecord(parsed)?.error) ?? undefined);
    }
    return parseJsonSafe<T>(res);
  }

  return {
    get: <T>(path: string) => request<T>(path),
    post: <T>(path: string, body: unknown = {}) => request<T>(path, "POST", body),
    patch: <T>(path: string, body: unknown = {}) => request<T>(path, "PATCH", body),
    del: async (path: string, body?: unknown) => {
      await request<unknown>(path, "DELETE", body);
    },
  };
}
