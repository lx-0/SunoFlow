import { NextRequest, NextResponse } from "next/server";
import {
  runRoutePipeline,
  type RouteOptions,
  type RoutePipelineOptions,
  type RouteSchemas,
} from "@/lib/route-pipeline";
import { createRouteWrapper } from "@/lib/route-handler/wrapper";
import {
  adminPreflight,
  anonPreflight,
  authPreflight,
  optionalAuthPreflight,
} from "@/lib/route-handler/preflight";
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
  return createRouteWrapper<P, B, Q, AuthContext>(
    authPreflight,
    (request, auth, { params, body, query }) =>
      handler(request, { auth, params, body, query }),
    options,
    "route-handler",
    (auth) => ({ userId: auth.userId }),
  );
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
  return createRouteWrapper<P, B, Q, OptionalAuthContext>(
    optionalAuthPreflight,
    (request, auth, { params, body, query }) =>
      handler(request, { auth, params, body, query }),
    options,
    "optional-auth-route-handler",
    (auth) => ({ userId: auth.userId }),
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
  return createRouteWrapper<P, B, Q, null>(
    async () => ({ context: null }),
    (request, _unused, { params, body, query }) =>
      handler(request, { params, body, query }),
    options,
    "public-route-handler",
    () => ({}),
  );
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
  return createRouteWrapper<P, B, Q, AdminContext>(
    async () => adminPreflight(),
    (request, admin, { params, body, query }) =>
      handler(request, { admin, params, body, query }),
    options,
    "admin-route-handler",
    (admin) => ({ userId: admin.adminId }),
  );
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
  return createRouteWrapper<P, never, Q, AnonContext>(
    async (request) => anonPreflight(request, options.rateLimit),
    (request, anon, { params, query }) => handler(request, { anon, params, query }),
    options,
    "anon-route-handler",
    () => ({}),
  );
}

export function cronRoute(
  handler: (request: NextRequest) => Promise<Response>,
  options?: RouteOptions,
) {
  return async (request: NextRequest): Promise<Response> => {
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: "Unauthorized", code: "UNAUTHORIZED" },
        { status: 401 },
      );
    }

    return runRoutePipeline(request, undefined, options, "cron-route-handler", {}, () =>
      handler(request),
    );
  };
}
