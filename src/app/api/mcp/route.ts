/**
 * SunoFlow MCP server — Streamable-HTTP transport endpoint.
 *
 * Concerns in order:
 *   1. Origin header allowlist (MCP spec: MUST validate Origin against DNS
 *      rebinding). Returns 403 on miss.
 *   2. Bearer API-key auth. Returns 401 + WWW-Authenticate on miss.
 *   3. Per-key sliding-window rate limit. Returns 429 + Retry-After on
 *      overflow.
 *   4. Per-request fresh Server with the full registry wired via
 *      `registerMcpHandlers` (shared with stdio).
 *   5. Tool errors and reject paths emit GlitchTip events via
 *      `logServerError`.
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";

import { createMcpHttpHandler } from "@/lib/mcp/http-transport";
import { registerMcpHandlers } from "@/lib/mcp/register-handlers";
import "@/lib/mcp/registry-bootstrap";
import { checkOrigin } from "@/lib/mcp/origin-guard";
import { checkMcpRateLimit } from "@/lib/mcp/rate-limit";
import { logServerError } from "@/lib/error-logger/server";
import { resolveApiKeyFromHeader } from "../../../../mcp/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SERVER_VERSION = "0.3.0";
const ROUTE = "/api/mcp";

function buildServerFor(userId: string): Server {
  const server = new Server(
    { name: "sunoflow-mcp", version: SERVER_VERSION },
    { capabilities: { tools: {}, resources: {} } },
  );
  registerMcpHandlers(server, userId);
  return server;
}

function forbidden(reason: string): Response {
  return new Response(JSON.stringify({ error: "forbidden", reason }), {
    status: 403,
    headers: { "content-type": "application/json" },
  });
}

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: {
      "content-type": "application/json",
      "www-authenticate": 'Bearer realm="sunoflow"',
    },
  });
}

function tooManyRequests(retryAfterSec: number, limit: number): Response {
  return new Response(JSON.stringify({ error: "rate_limited" }), {
    status: 429,
    headers: {
      "content-type": "application/json",
      "retry-after": String(retryAfterSec),
      "x-ratelimit-limit": String(limit),
      "x-ratelimit-remaining": "0",
    },
  });
}

function bearerFromHeader(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1].trim() : null;
}

async function handleRequest(req: Request): Promise<Response> {
  // 1. Origin
  const originCheck = checkOrigin(req);
  if (!originCheck.ok) {
    logServerError("mcp.origin.rejected", new Error(`origin ${originCheck.reason}`), {
      route: ROUTE,
      tags: {
        reason: originCheck.reason,
        origin: originCheck.origin ?? "missing",
      },
    });
    return forbidden(`origin ${originCheck.reason}`);
  }

  // 2. Bearer auth
  const authHeader = req.headers.get("authorization");
  const userId = await resolveApiKeyFromHeader(authHeader);
  if (!userId) {
    logServerError("mcp.auth.rejected", new Error("invalid or missing bearer"), {
      route: ROUTE,
      tags: { origin: originCheck.origin ?? "none" },
    });
    return unauthorized();
  }

  // 3. Rate limit (key-scoped, post-auth so unauthenticated probes don't
  //    poison authenticated users' buckets)
  const rawKey = bearerFromHeader(authHeader);
  if (rawKey) {
    const rl = checkMcpRateLimit(rawKey);
    if (!rl.allowed) {
      logServerError("mcp.rate_limit.exceeded", new Error("rate limit exceeded"), {
        userId,
        route: ROUTE,
        tags: { limit: String(rl.limit) },
      });
      return tooManyRequests(rl.retryAfterSec, rl.limit);
    }
  }

  // 4. Build + dispatch
  try {
    const handler = createMcpHttpHandler({
      buildServer: () => buildServerFor(userId),
    });
    return await handler(req);
  } catch (err) {
    logServerError("mcp.handler.error", err, { userId, route: ROUTE });
    return new Response(JSON.stringify({ error: "internal" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}

export async function POST(req: Request): Promise<Response> {
  return handleRequest(req);
}

export async function GET(req: Request): Promise<Response> {
  return handleRequest(req);
}
