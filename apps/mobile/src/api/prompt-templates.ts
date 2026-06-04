import { apiGet } from "./client";

// Prompt templates talk to the existing web endpoint (authRoute → resolveUser
// accepts the bearer sk- key). GET /api/prompt-templates returns the user's
// templates plus built-ins, alongside the distinct category list:
//   { templates: PromptTemplate[], categories: (string | null)[] }
// The success path returns result.data directly (see route-response.ts), so the
// payload is NOT wrapped in an envelope. Map defensively — never throw on shape.

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
