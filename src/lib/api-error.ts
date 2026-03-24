import { NextResponse } from "next/server";

/**
 * Standard API error response shape.
 * All API routes must use this for error responses.
 */
export interface ApiErrorBody {
  error: string;
  code: string;
  details?: Record<string, unknown>;
}

/**
 * Common error codes used across API routes.
 */
export const ErrorCode = {
  VALIDATION_ERROR: "VALIDATION_ERROR",
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  RATE_LIMIT: "RATE_LIMIT",
  CONFLICT: "CONFLICT",
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  SUNO_API_ERROR: "SUNO_API_ERROR",
  SUNO_RATE_LIMIT: "SUNO_RATE_LIMIT",
  SUNO_AUTH_ERROR: "SUNO_AUTH_ERROR",
  TIMEOUT: "TIMEOUT",
  INSUFFICIENT_CREDITS: "INSUFFICIENT_CREDITS",
} as const;

export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Create a standardised JSON error response.
 *
 * @example
 * return apiError("Prompt is required", ErrorCode.VALIDATION_ERROR, 400);
 * return apiError("Not found", ErrorCode.NOT_FOUND, 404);
 */
export function apiError(
  message: string,
  code: ErrorCodeValue,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ApiErrorBody> {
  const body: ApiErrorBody = { error: message, code };
  if (details) body.details = details;
  return NextResponse.json(body, { status });
}

/** 400 — validation failure */
export const badRequest = (msg: string, details?: Record<string, unknown>) =>
  apiError(msg, ErrorCode.VALIDATION_ERROR, 400, details);

/** 401 — not authenticated */
export const unauthorized = (msg = "Unauthorized") =>
  apiError(msg, ErrorCode.UNAUTHORIZED, 401);

/** 403 — authenticated but not allowed */
export const forbidden = (msg = "Forbidden") =>
  apiError(msg, ErrorCode.FORBIDDEN, 403);

/** 404 — resource not found */
export const notFound = (msg = "Not found") =>
  apiError(msg, ErrorCode.NOT_FOUND, 404);

/** 429 — rate limit exceeded */
export const rateLimited = (
  msg: string,
  details?: Record<string, unknown>,
  headers?: HeadersInit
) => {
  const body: ApiErrorBody = { error: msg, code: ErrorCode.RATE_LIMIT };
  if (details) body.details = details;
  return NextResponse.json(body, { status: 429, headers });
};

/** 500 — internal server error (never expose internals) */
export const internalError = (msg = "Internal server error") =>
  apiError(msg, ErrorCode.INTERNAL_ERROR, 500);

/** 402 — insufficient credits */
export const insufficientCredits = (msg = "Insufficient credits") =>
  apiError(msg, ErrorCode.INSUFFICIENT_CREDITS, 402);

/** 503 — upstream/external service unavailable */
export const serviceUnavailable = (msg: string) =>
  apiError(msg, ErrorCode.SERVICE_UNAVAILABLE, 503);
