/**
 * Tool registry for the SunoFlow MCP server.
 * Tools register themselves by calling registerTool() at module load time.
 */

export interface McpTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  handler: (input: unknown, userId: string) => Promise<unknown>;
}

const tools = new Map<string, McpTool>();

export function registerTool(tool: McpTool): void {
  tools.set(tool.name, tool);
}

export function getTools(): McpTool[] {
  return Array.from(tools.values());
}

export function getTool(name: string): McpTool | undefined {
  return tools.get(name);
}

/** Reset registry — for use in tests only. */
export function _resetRegistry(): void {
  tools.clear();
}
