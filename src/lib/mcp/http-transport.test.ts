import { describe, it, expect } from "vitest";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

import { createMcpHttpHandler } from "./http-transport";

function buildStubServer(): Server {
  const server = new Server(
    { name: "stub-mcp", version: "0.0.1" },
    { capabilities: { tools: {} } },
  );
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [
      {
        name: "ping",
        description: "stub tool",
        inputSchema: { type: "object", properties: {}, additionalProperties: false },
      },
    ],
  }));
  server.setRequestHandler(CallToolRequestSchema, async () => ({
    content: [{ type: "text", text: "pong" }],
  }));
  return server;
}

const COMMON_HEADERS = {
  "content-type": "application/json",
  accept: "application/json, text/event-stream",
};

async function readBodyText(res: Response): Promise<string> {
  return await res.text();
}

describe("createMcpHttpHandler", () => {
  it("returns a Response for an initialize POST", async () => {
    const handler = createMcpHttpHandler({ buildServer: buildStubServer });

    const res = await handler(
      new Request("http://test/mcp", {
        method: "POST",
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test-client", version: "0.0.1" },
          },
        }),
      }),
    );

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    const body = await readBodyText(res);
    // initialize response must mention protocolVersion or serverInfo
    expect(body).toMatch(/protocolVersion|serverInfo|stub-mcp/);
  });

  it("lists the stub tool after initialize", async () => {
    const handler = createMcpHttpHandler({ buildServer: buildStubServer });

    // initialize first (stateless mode: server still expects the lifecycle)
    await handler(
      new Request("http://test/mcp", {
        method: "POST",
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 1,
          method: "initialize",
          params: {
            protocolVersion: "2025-06-18",
            capabilities: {},
            clientInfo: { name: "test-client", version: "0.0.1" },
          },
        }),
      }),
    );

    const res = await handler(
      new Request("http://test/mcp", {
        method: "POST",
        headers: COMMON_HEADERS,
        body: JSON.stringify({
          jsonrpc: "2.0",
          id: 2,
          method: "tools/list",
        }),
      }),
    );

    expect(res.status).toBeGreaterThanOrEqual(200);
    expect(res.status).toBeLessThan(300);
    const body = await readBodyText(res);
    expect(body).toContain("ping");
  });
});
