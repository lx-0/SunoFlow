import { NextRequest } from "next/server";
import { runRoutePipeline } from "@/lib/route-pipeline/runner";
import type {
  PipelineCtx,
  PreflightResult,
  RouteContextKey,
} from "@/lib/route-handler/types";
import type {
  RouteOptions,
  RoutePipelineOptions,
  SegmentData,
} from "@/lib/route-pipeline/types";

export type RouteContextWithKey<
  K extends RouteContextKey,
  TContext,
  P extends Record<string, string>,
  B,
  Q,
> = Record<K, TContext> & PipelineCtx<P, B, Q>;

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

type PreflightDescriptor<TContext> = {
  preflight: (request: NextRequest) => Promise<PreflightResult<TContext>>;
  logLabel: string;
  getLogContext: (context: TContext) => Record<string, unknown>;
};

export function withParsedContext<P extends Record<string, string>, B, Q>(
  parsed: PipelineCtx<P, B, Q>,
): PipelineCtx<P, B, Q> {
  return parsed;
}

export function withKeyedParsedContext<
  K extends RouteContextKey,
  TAuthContext,
  P extends Record<string, string>,
  B,
  Q,
>(
  key: K,
  authContext: TAuthContext,
  parsed: PipelineCtx<P, B, Q>,
): Record<K, TAuthContext> & PipelineCtx<P, B, Q> {
  return {
    [key]: authContext,
    ...withParsedContext(parsed),
  } as Record<K, TAuthContext> & PipelineCtx<P, B, Q>;
}

async function runWithPreflight<TContext, TReturn>(
  request: NextRequest,
  descriptor: PreflightDescriptor<TContext>,
  execute: (context: TContext) => Promise<TReturn>,
): Promise<Response | TReturn> {
  const preflightResult = await descriptor.preflight(request);
  if (!preflightResult.ok) {
    return preflightResult.error;
  }

  return execute(preflightResult.context);
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
    return runWithPreflight<Response>(
      request,
      descriptor,
      (context) =>
        runRoutePipeline(
          request,
          segmentData,
          options,
          descriptor.logLabel,
          descriptor.getLogContext(context),
          (parsed) => handler(request, descriptor.toHandlerContext(context, parsed)),
        ),
    );
  };
}

export function createPreflightRequestRoute<TContext>(
  descriptor: PreflightDescriptor<TContext>,
  handler: (request: NextRequest, context: TContext) => Promise<Response>,
  options?: RouteOptions,
) {
  return async (request: NextRequest): Promise<Response> => {
    return runWithPreflight<Response>(
      request,
      descriptor,
      (context) =>
        runRoutePipeline(
          request,
          undefined,
          options,
          descriptor.logLabel,
          descriptor.getLogContext(context),
          () => handler(request, context),
        ),
    );
  };
}
