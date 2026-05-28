/**
 * Wires the populated tool + resource registries into an MCP `Server`.
 *
 * Sets the four required request handlers (ListTools, CallTool, ListResources,
 * ListResourceTemplates, ReadResource) on the given server, scoping every
 * call to the supplied userId. Identical wiring works for stdio and HTTP
 * transports — the only difference is how the caller resolves the userId.
 *
 * `import "./registry-bootstrap"` must run before `registerMcpHandlers` is
 * called, otherwise the registries are empty.
 */

import type { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ListResourceTemplatesRequestSchema,
  ReadResourceRequestSchema,
  McpError,
  ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";

import { getTool, getTools } from "@mcp/registry";
import {
  getStaticResources,
  getTemplateResources,
  resolveResource,
} from "@mcp/resources";

export function registerMcpHandlers(server: Server, userId: string): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: getTools().map((t) => ({
      name: t.name,
      description: t.description,
      inputSchema: t.inputSchema,
    })),
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const tool = getTool(request.params.name);
    if (!tool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Unknown tool: ${request.params.name}`,
      );
    }
    const result = await tool.handler(
      request.params.arguments ?? {},
      userId,
    );
    return {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    };
  });

  server.setRequestHandler(ListResourcesRequestSchema, async () => ({
    resources: getStaticResources().map((r) => ({
      uri: r.uri,
      name: r.name,
      description: r.description,
      mimeType: r.mimeType,
    })),
  }));

  server.setRequestHandler(ListResourceTemplatesRequestSchema, async () => ({
    resourceTemplates: getTemplateResources().map((t) => ({
      uriTemplate: t.uriTemplate,
      name: t.name,
      description: t.description,
      mimeType: t.mimeType,
    })),
  }));

  server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
    const uri = request.params.uri;
    const content = await resolveResource(uri, userId);
    if (!content) {
      throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
    }
    return {
      contents: [
        {
          uri: content.uri,
          mimeType: content.mimeType,
          text: content.text,
        },
      ],
    };
  });
}
