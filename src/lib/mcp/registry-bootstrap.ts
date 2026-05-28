/**
 * Single-import bootstrap for the SunoFlow MCP tool + resource registries.
 *
 * Each `import` here is a side-effect import: the module registers itself
 * via `registerTool` / `registerStaticResource` / `registerTemplateResource`
 * at module load. After importing this file once, `getTools()` returns 15
 * entries and `getStaticResources()` / `getTemplateResources()` are populated.
 *
 * Both the stdio server (`mcp/server.ts`) and the HTTP route
 * (`src/app/api/mcp/route.ts`) import this file. Keeping the import list in
 * one place prevents drift between the two transports.
 *
 * Bundler note: the `mcp/` directory lives at the repo root, NOT under
 * `src/`, so `@/*` aliases can't be used. The relative paths below are the
 * canonical reference for now; S04's stdio-removal step migrates these
 * modules into `src/lib/mcp/` and the relative `../../../mcp/` jumps
 * collapse.
 */

// Tools (15)
import "../../../mcp/tools/info";
import "../../../mcp/tools/generate_song";
import "../../../mcp/tools/extend_song";
import "../../../mcp/tools/list_songs";
import "../../../mcp/tools/get_song";
import "../../../mcp/tools/playlist";
import "../../../mcp/tools/get_credits";
import "../../../mcp/tools/generate_lyrics";
import "../../../mcp/tools/boost_style";
import "../../../mcp/tools/separate_vocals";
import "../../../mcp/tools/convert_to_wav";
import "../../../mcp/tools/generate_midi";
import "../../../mcp/tools/create_music_video";
import "../../../mcp/tools/generate_cover_image";
import "../../../mcp/tools/generate_sounds";

// Resource providers (4)
import "../../../mcp/providers/songs";
import "../../../mcp/providers/playlists";
import "../../../mcp/providers/feed";
import "../../../mcp/providers/credits";
