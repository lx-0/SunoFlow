import { NextRequest } from "next/server";
import {
  runRoutePipeline,
  type RouteOptions,
  type RoutePipelineOptions,
  type SegmentData,
} from "@/lib/route-pipeline";
import type { PipelineCtx } from "@/lib/route-handler/types";

export type PreflightResult<TContext> =
  | { ok: true; context: TContext }
  | { ok: false; error: Response };

export type ParsedRouteContext<P extends Record<string, string>, B, Q> = {
  params: P;
  body: B;
  query: Q;
};

export type RouteContextWithKey<
  K extends "auth" | "admin" | "anon",
  TContext,
  P extends Record<string, string>,
  B,
  Q,
> = Record<K, TContext> & ParsedRouteContext<P, B, Q>;

export type RouteDescriptor<
  P extends Record<string, string>,
  B,
  Q,
  TContext,
  THandlerContext,
> = {
  preflight: (request: NextRequest) => Promise<PreflightResult<TContext>>;
  toHandlerContext: (
    context: TContext,
    parsed: PipelineCtx<P, B, Q>,
  ) => THandlerContext;
  logLabel: string;
  getLogContext: (context: TContext) => Record<string, unknown>;
};

export function withParsedContext<P extends Record<string, string>, B, Q>(
  parsed: PipelineCtx<P, B, Q>,
): ParsedRouteContext<P, B, Q> {
  return {
    params: parsed.params,
    body: parsed.body,
    query: parsed.query,
  };
}

export function withKeyedParsedContext<
  K extends "auth" | "admin" | "anon",
  TAuthContext,
  P extends Record<string, string>,
  B,
  Q,
>(
  key: K,
  authContext: TAuthContext,
  parsed: PipelineCtx<P, B, Q>,
): Record<K, TAuthContext> & ParsedRouteContext<P, B, Q> {
  return {
    [key]: authContext,
    ...withParsedContext(parsed),
  } as Record<K, TAuthContext> & ParsedRouteContext<P, B, Q>;
}

export function createPreflightRoute<
  P extends Record<string, string>,
  B,
  Q,
  TContext,
  THandlerContext,
>(
  descriptor: RouteDescriptor<P, B, Q, TContext, THandlerContext>,
  handler: (
    request: NextRequest,
    ctx: THandlerContext,
  ) => Promise<Response>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return async (
    request: NextRequest,
    segmentData: SegmentData<P>,
  ): Promise<Response> => {
    const preflightResult = await descriptor.preflight(request);
    if (!preflightResult.ok) {
      return preflightResult.error;
    }

    return runRoutePipeline(
      request,
      segmentData,
      options,
      descriptor.logLabel,
      descriptor.getLogContext(preflightResult.context),
      (parsed) =>
        handler(request, descriptor.toHandlerContext(preflightResult.context, parsed)),
    );
  };
}

export function createPreflightRequestRoute<TContext>(
  descriptor: {
    preflight: (request: NextRequest) => Promise<PreflightResult<TContext>>;
    logLabel: string;
    getLogContext: (context: TContext) => Record<string, unknown>;
  },
  handler: (request: NextRequest, context: TContext) => Promise<Response>,
  options?: RouteOptions,
) {
  return async (request: NextRequest): Promise<Response> => {
    const preflightResult = await descriptor.preflight(request);
    if (!preflightResult.ok) {
      return preflightResult.error;
    }

    return runRoutePipeline(
      request,
      undefined,
      options,
      descriptor.logLabel,
      descriptor.getLogContext(preflightResult.context),
      () => handler(request, preflightResult.context),
    );
  };
}
