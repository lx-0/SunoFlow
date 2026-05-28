/**
 * Streamable-HTTP transport adapter for the SunoFlow MCP server.
 *
 * Wraps the SDK's WebStandardStreamableHTTPServerTransport so a Next.js
 * App Router route handler can return `handler(req)` directly.
 *
 * Callers build a fresh Server per request (stateless mode for the spike).
 * Auth, tool registration, and origin validation live in the caller, not here.
 */

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Server } from "@modelcontextprotocol/sdk/server/index.js";

export interface CreateMcpHttpHandlerOptions {
  buildServer: () => Server | Promise<Server>;
}

export type McpHttpHandler = (req: Request) => Promise<Response>;

export function createMcpHttpHandler(
  opts: CreateMcpHttpHandlerOptions,
): McpHttpHandler {
  return async (req: Request): Promise<Response> => {
    const transport = new WebStandardStreamableHTTPServerTransport({
      sessionIdGenerator: undefined,
    });
    const server = await opts.buildServer();
    await server.connect(transport);
    return transport.handleRequest(req);
  };
}
