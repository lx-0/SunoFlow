import { NextRequest, NextResponse } from "next/server";
import {
  createPreflightRequestRoute,
  createPreflightRoute,
  withKeyedParsedContext,
  type RouteContextWithKey,
} from "@/lib/route-handler/factory";
import type { RouteOptions, RoutePipelineOptions } from "@/lib/route-pipeline/types";

type PreflightResult<TContext> =
  | { ok: true; context: TContext }
  | { ok: false; error: Response };

export function createKeyedRoute<
  K extends "auth" | "admin" | "anon",
  TContext,
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
>(
  key: K,
  preflight: (request: NextRequest) => Promise<PreflightResult<TContext>>,
  logLabel: string,
  getLogContext: (context: TContext) => Record<string, unknown>,
  handler: (
    request: NextRequest,
    ctx: RouteContextWithKey<K, TContext, P, B, Q>,
  ) => Promise<Response>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createPreflightRoute<P, B, Q, TContext, RouteContextWithKey<K, TContext, P, B, Q>>(
    {
      preflight,
      toHandlerContext: (context, parsed) => withKeyedParsedContext(key, context, parsed),
      logLabel,
      getLogContext,
    },
    handler,
    options,
  );
}

export function createJsonDataRoute<
  Ctx,
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
  T = unknown,
>(
  route: (
    handler: (
      request: NextRequest,
      ctx: Ctx,
    ) => Promise<Response>,
    options?: RoutePipelineOptions<B, Q>,
  ) => (
    request: NextRequest,
    context: { params: Promise<P> },
  ) => Promise<Response>,
  handler: (
    request: NextRequest,
    ctx: Ctx,
  ) => Promise<T>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return route(async (request, ctx) => NextResponse.json(await handler(request, ctx)), options);
}

export function createCronRoute(
  handler: (request: NextRequest) => Promise<Response>,
  options?: RouteOptions,
) {
  return createPreflightRequestRoute(
    {
      preflight: async (request) => {
        const authHeader = request.headers.get("authorization");
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
          return {
            ok: false,
            error: NextResponse.json(
              { error: "Unauthorized", code: "UNAUTHORIZED" },
              { status: 401 },
            ),
          };
        }

        return { ok: true, context: null };
      },
      logLabel: "cron-route-handler",
      getLogContext: () => ({}),
    },
    async (request) => handler(request),
    options,
  );
}
