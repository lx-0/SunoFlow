# SunoFlow MCP Server

SunoFlow exposes a [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that lets AI agents (Claude Desktop, Cursor, Windsurf, etc.) interact with the platform programmatically.

## Transport

Two transports are supported:

- **Streamable HTTP (recommended, hosted)** — SunoFlow hosts the server at `https://sunoflow.app/api/mcp`. Clients connect remotely with a Bearer API key. No local install or database required.
- **stdio (legacy, self-hosted only)** — the host spawns `mcp/server.ts` as a subprocess. Requires the SunoFlow repo + a local `DATABASE_URL` because the stdio server validates keys against Prisma directly. Deprecated as of 0.3.0; will be removed in a future release.

## Authentication

Generate a personal API key in your SunoFlow account settings (`/settings/api-keys`). Both transports use the same key.

- Streamable HTTP: send as `Authorization: Bearer sk-...`
- stdio: set as `SUNOFLOW_API_KEY` env var when spawning the process

## Claude Code (Streamable HTTP, recommended)

The SunoFlow plugin ships a `.mcp.json` that points at the hosted endpoint. Install the plugin and export the API key — no other config needed:

```bash
/plugin install sunoflow
export SUNOFLOW_API_KEY=sk-...
```

Equivalent manual config:

```bash
claude mcp add --transport http sunoflow https://sunoflow.app/api/mcp \
  --header "Authorization: Bearer sk-your-key-here"
```

For a self-hosted instance, override the base URL:

```bash
SUNOFLOW_BASE_URL=https://sunoflow.example.com SUNOFLOW_API_KEY=sk-... /plugin install sunoflow
```

## Claude Desktop (stdio, legacy)

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

> The stdio server validates keys against `DATABASE_URL` on startup; not appropriate for non-self-hosted users.

## Smoke test

The `scripts/smoke-mcp.mjs` script drives `initialize` → `tools/list` → `tools/call sunoflow_info` against any HTTP MCP endpoint and verifies the responses. Use it to confirm a deploy is healthy or to probe a self-hosted instance.

```bash
# Against production
SUNOFLOW_API_KEY=sk-... node scripts/smoke-mcp.mjs https://sunoflow.app/api/mcp

# Against local dev server (pnpm dev, requires DB)
SUNOFLOW_API_KEY=sk-... node scripts/smoke-mcp.mjs
```

Exits 0 on full success; non-zero on the first failed check. Output is one line per protocol step.

## Available tools

The canonical reference (with full parameter tables, examples, and credit costs) is [`skills/sunoflow/SKILL.md`](../skills/sunoflow/SKILL.md). Summary of the 16 registered tools:

| Tool | Group | Purpose |
|------|-------|---------|
| `generate_song` | Generation | Submit a song generation. Returns `songId`; poll `get_song`. |
| `extend_song` | Generation | Continue an existing song from a point (or end). |
| `generate_sounds` | Generation | Ambient sounds / SFX (V5 only). |
| `generate_lyrics` | Generation | Lyrics from a 200-char description (2 credits). |
| `boost_style` | Generation | Expand a short genre tag into a rich style prompt (5 credits). |
| `list_songs` | Library | Paginated browse with genre/mood/status filters. |
| `get_song` | Library | Full song detail (also used for polling pending generations). |
| `create_playlist` | Library | Create playlist (max 50/user). |
| `add_to_playlist` | Library | Add song to playlist (max 500/playlist, idempotent). |
| `separate_vocals` | Audio | Vocal/instrumental split (10) or full stem split (50 credits). |
| `convert_to_wav` | Audio | Lossless WAV conversion. |
| `generate_midi` | Audio | Extract per-instrument MIDI tracks. |
| `create_music_video` | Visual | MP4 with synchronized visuals (retained 15 days). |
| `generate_cover_image` | Visual | 2 cover-art variations (retained 14 days). |
| `get_credits` | Utility | Monthly credit balance + cost table. |
| `sunoflow_info` | Utility | Server version + tool inventory probe. |

## Available resources

Read-only URIs for direct data access:

| URI | Returns |
|------|---------|
| `sunoflow://stats/credits` | Credit balance, monthly usage, cost reference |
| `sunoflow://feed/inspiration` | Top 20 pending RSS-feed inspiration items |
| `sunoflow://songs/{id}` | Song metadata, audio URL, lyrics, generation params |
| `sunoflow://playlists/{id}` | Playlist metadata + ordered tracks |

No list-resources for songs/playlists — use `list_songs` and the playlist API for browsing.

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
