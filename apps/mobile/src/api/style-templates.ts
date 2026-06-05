import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

// Validation bounds (mirror the server's createTemplateSchema).
export const STYLE_TEMPLATE_NAME_MAX = 100;
export const STYLE_TEMPLATE_TAGS_MAX = 500;

// Style templates talk to the existing web endpoint (authDataRoute → resolveUser
// accepts the bearer sk- key). GET /api/style-templates returns the user's saved
// style presets, newest-first:
//   { templates: StyleTemplate[] }
// authDataRoute returns the handler value directly via NextResponse.json(data),
// so the payload is NOT wrapped in an envelope. The DB row carries `tags` (the
// comma-separated style string used to seed Generate's style field). Map
// defensively — never throw on shape.

export interface StyleTemplate {
  id: string;
  name: string;
  /** The style/tags string this template carries (feeds Generate's style). */
  tags: string;
  sourceSongId: string | null;
}

interface StyleTemplatesResponse {
  templates?: unknown[];
}

function mapTemplate(raw: unknown): StyleTemplate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.name !== "string" || typeof t.tags !== "string") {
    return null;
  }
  return {
    id: t.id,
    name: t.name,
    tags: t.tags,
    sourceSongId: typeof t.sourceSongId === "string" ? t.sourceSongId : null,
  };
}

/** List the user's saved style templates (newest-first). */
export async function fetchStyleTemplates(): Promise<StyleTemplate[]> {
  const res = await apiGet<StyleTemplatesResponse>(`/api/style-templates`);
  return (Array.isArray(res?.templates) ? res.templates : [])
    .map(mapTemplate)
    .filter((t): t is StyleTemplate => t !== null);
}

/** Create a style template (manual — name + tags, no source song needed). */
export async function createStyleTemplate(name: string, tags: string): Promise<void> {
  await apiPost("/api/style-templates", { name: name.trim(), tags: tags.trim() });
}

/** Rename / re-tag an existing style template. */
export async function updateStyleTemplate(
  id: string,
  patch: { name?: string; tags?: string },
): Promise<void> {
  await apiPatch(`/api/style-templates/${id}`, patch);
}

/** Delete a style template. */
export async function deleteStyleTemplate(id: string): Promise<void> {
  await apiDelete(`/api/style-templates/${id}`);
}
