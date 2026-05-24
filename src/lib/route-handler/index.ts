import { NextRequest } from "next/server";
import {
  adminPreflight,
  anonPreflight,
  authPreflight,
  optionalAuthPreflight,
} from "@/lib/route-handler/preflight";
import {
  createPreflightRoute,
  withParsedContext,
} from "@/lib/route-handler/factory";
import {
  createCronRoute,
  createJsonDataRoute,
  createKeyedRoute,
} from "@/lib/route-handler/builders";
import type { PipelineCtx } from "@/lib/route-handler/types";
import type {
  RouteOptions,
  RoutePipelineOptions,
  RouteSchemas,
} from "@/lib/route-pipeline/types";
import type {
  AdminContext,
  AnonContext,
  AuthContext,
  OptionalAuthContext,
  RateLimitConfig,
} from "@/lib/route-handler/types";

export { requireOwned, resultResponse } from "@/lib/route-response";
export type {
  AdminContext,
  AnonContext,
  AuthContext,
  OptionalAuthContext,
  RateLimitConfig,
  RouteContextKey,
} from "@/lib/route-handler/types";

export function authRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
>(
  handler: (
    request: NextRequest,
    ctx: { auth: AuthContext; params: P; body: B; query: Q },
  ) => Promise<Response>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createKeyedRoute<"auth", AuthContext, P, B, Q>(
    "auth",
    authPreflight,
    "route-handler",
    (auth) => ({ userId: auth.userId }),
    handler,
    options,
  );
}

export function authDataRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
  T = unknown,
>(
  handler: (
    request: NextRequest,
    ctx: { auth: AuthContext; params: P; body: B; query: Q },
  ) => Promise<T>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createJsonDataRoute(authRoute<P, B, Q>, handler, options);
}

export function optionalAuthDataRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
  T = unknown,
>(
  handler: (
    request: NextRequest,
    ctx: { auth: OptionalAuthContext; params: P; body: B; query: Q },
  ) => Promise<T>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createJsonDataRoute(optionalAuthRoute<P, B, Q>, handler, options);
}

export function optionalAuthRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
>(
  handler: (
    request: NextRequest,
    ctx: { auth: OptionalAuthContext; params: P; body: B; query: Q },
  ) => Promise<Response>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createKeyedRoute<"auth", OptionalAuthContext, P, B, Q>(
    "auth",
    optionalAuthPreflight,
    "optional-auth-route-handler",
    (auth) => ({ userId: auth.userId }),
    handler,
    options,
  );
}

export function publicRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
>(
  handler: (
    request: NextRequest,
    ctx: { params: P; body: B; query: Q },
  ) => Promise<Response>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createPreflightRoute<P, B, Q, null, PipelineCtx<P, B, Q>>(
    {
      preflight: async () => ({ ok: true, context: null }),
      toHandlerContext: (_unused, parsed) => withParsedContext(parsed),
      logLabel: "public-route-handler",
      getLogContext: () => ({}),
    },
    handler,
    options,
  );
}

export function publicDataRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
  T = unknown,
>(
  handler: (
    request: NextRequest,
    ctx: { params: P; body: B; query: Q },
  ) => Promise<T>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createJsonDataRoute(publicRoute<P, B, Q>, handler, options);
}

export function adminRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
>(
  handler: (
    request: NextRequest,
    ctx: { admin: AdminContext; params: P; body: B; query: Q },
  ) => Promise<Response>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createKeyedRoute<"admin", AdminContext, P, B, Q>(
    "admin",
    async () => adminPreflight(),
    "admin-route-handler",
    (admin) => ({ userId: admin.adminId }),
    handler,
    options,
  );
}

export function adminDataRoute<
  P extends Record<string, string> = Record<string, never>,
  B = undefined,
  Q = undefined,
  T = unknown,
>(
  handler: (
    request: NextRequest,
    ctx: { admin: AdminContext; params: P; body: B; query: Q },
  ) => Promise<T>,
  options?: RoutePipelineOptions<B, Q>,
) {
  return createJsonDataRoute(adminRoute<P, B, Q>, handler, options);
}

export function anonRoute<
  P extends Record<string, string> = Record<string, never>,
  Q = undefined,
>(
  handler: (
    request: NextRequest,
    ctx: { anon: AnonContext; params: P; query: Q },
  ) => Promise<Response>,
  options: RouteOptions & RouteSchemas<never, Q> & { rateLimit: RateLimitConfig },
) {
  return createKeyedRoute<"anon", AnonContext, P, never, Q>(
    "anon",
    async (request) => anonPreflight(request, options.rateLimit),
    "anon-route-handler",
    () => ({}),
    handler,
    options,
  );
}

export function cronRoute(
  handler: (request: NextRequest) => Promise<Response>,
  options?: RouteOptions,
) {
  return createCronRoute(handler, options);
}
