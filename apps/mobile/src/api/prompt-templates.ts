import { apiGet, apiPost, apiPatch, apiDelete } from "./client";

// Prompt templates talk to the existing web endpoint (authRoute → resolveUser
// accepts the bearer sk- key). GET /api/prompt-templates returns the user's
// templates plus built-ins, alongside the distinct category list:
//   { templates: PromptTemplate[], categories: (string | null)[] }
// The success path returns result.data directly (see route-response.ts), so the
// payload is NOT wrapped in an envelope. Map defensively — never throw on shape.

// Validation bounds (mirror the server's create/update schema).
export const PROMPT_TEMPLATE_NAME_MAX = 100;

export interface PromptTemplate {
  id: string;
  name: string;
  prompt: string;
  description: string | null;
  style: string | null;
  category: string | null;
  isInstrumental: boolean;
  isBuiltIn: boolean;
}

interface PromptTemplatesResponse {
  templates?: unknown[];
  categories?: unknown[];
}

function mapTemplate(raw: unknown): PromptTemplate | null {
  if (typeof raw !== "object" || raw === null) return null;
  const t = raw as Record<string, unknown>;
  if (typeof t.id !== "string" || typeof t.name !== "string" || typeof t.prompt !== "string") {
    return null;
  }
  return {
    id: t.id,
    name: t.name,
    prompt: t.prompt,
    description: typeof t.description === "string" ? t.description : null,
    style: typeof t.style === "string" ? t.style : null,
    category: typeof t.category === "string" ? t.category : null,
    isInstrumental: t.isInstrumental === true,
    isBuiltIn: t.isBuiltIn === true,
  };
}

/** List built-in + user prompt templates. */
export async function fetchPromptTemplates(): Promise<PromptTemplate[]> {
  const res = await apiGet<PromptTemplatesResponse>(`/api/prompt-templates`);
  return (Array.isArray(res?.templates) ? res.templates : [])
    .map(mapTemplate)
    .filter((t): t is PromptTemplate => t !== null);
}

/** Create a prompt template (name + prompt required; style + instrumental optional). */
export async function createPromptTemplate(input: {
  name: string;
  prompt: string;
  style?: string;
  isInstrumental?: boolean;
}): Promise<void> {
  const style = input.style?.trim();
  await apiPost("/api/prompt-templates", {
    name: input.name.trim(),
    prompt: input.prompt.trim(),
    ...(style ? { style } : {}),
    ...(input.isInstrumental !== undefined ? { isInstrumental: input.isInstrumental } : {}),
  });
}

/** Update an existing (non-built-in) prompt template. */
export async function updatePromptTemplate(
  id: string,
  patch: { name?: string; prompt?: string; style?: string; isInstrumental?: boolean },
): Promise<void> {
  const body: { name?: string; prompt?: string; style?: string; isInstrumental?: boolean } = {};
  if (patch.name !== undefined) body.name = patch.name.trim();
  if (patch.prompt !== undefined) body.prompt = patch.prompt.trim();
  if (patch.style !== undefined) body.style = patch.style.trim();
  if (patch.isInstrumental !== undefined) body.isInstrumental = patch.isInstrumental;
  await apiPatch(`/api/prompt-templates/${id}`, body);
}

/** Delete a prompt template. */
export async function deletePromptTemplate(id: string): Promise<void> {
  await apiDelete(`/api/prompt-templates/${id}`);
}
