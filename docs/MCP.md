# SunoFlow MCP Server

SunoFlow exposes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that lets AI agents (Claude Desktop, Cursor, Windsurf, etc.) interact with the platform programmatically.

## Transport

The server uses **stdio transport** — the host spawns it as a subprocess, communicates over stdin/stdout, and the server logs to stderr.

## Authentication

Generate a personal API key in your SunoFlow account settings (`/settings/api-keys`).
Set it as `SUNOFLOW_API_KEY` when launching the server. The server exits immediately if the key is missing or revoked.

## Quick start (local)

```bash
SUNOFLOW_API_KEY=sk-... tsx mcp/server.ts
```

Or compile first:

```bash
pnpm build:mcp
node dist/mcp/server.js
```

## Claude Desktop

Add the following to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "sunoflow": {
      "command": "tsx",
      "args": ["/absolute/path/to/sunoflow/mcp/server.ts"],
      "env": {
        "SUNOFLOW_API_KEY": "sk-your-key-here",
        "DATABASE_URL": "postgresql://..."
      }
    }
  }
}
```

> **Note:** The server needs a `DATABASE_URL` that points to the SunoFlow Postgres database, because it validates your API key on startup.

For a self-hosted instance, set `DATABASE_URL` to your database connection string.
For the hosted service, contact support for a read-only replica credential suitable for MCP use.

## Available tools

| Tool | Description |
|------|-------------|
| `sunoflow_info` | Returns server version and list of all registered tools |

Additional tools (song generation, library management, etc.) will be registered as the integration matures — see [SUNAA-403](/SUNAA/issues/SUNAA-403) for the roadmap.

## Adding tools

Create a file in `mcp/tools/` and call `registerTool()` at module load time:

```typescript
// mcp/tools/my-tool.ts
import { registerTool } from "../registry";

registerTool({
  name: "sunoflow_my_tool",
  description: "What this tool does",
  inputSchema: {
    type: "object",
    properties: {
      prompt: { type: "string", description: "The input" },
    },
    required: ["prompt"],
  },
  async handler(input, userId) {
    // userId is the authenticated SunoFlow user
    return { result: "..." };
  },
});
```

Then import it in `mcp/server.ts`:

```typescript
import "./tools/my-tool";
```

## Running tests

```bash
pnpm test mcp/server.test.ts
```
