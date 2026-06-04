import { apiGet } from "@/api/client";

// Generation presets: saved bundles of generation params (style/lyrics prompts,
// instrumental + custom-mode flags) the user can reuse on the Generate screen.
// Mirrors the web GET /api/presets shape: { presets: GenerationPreset[] }.
//
// Defensive mapping: the endpoint is authDataRoute-wrapped and returns Prisma
// rows, but we never trust the wire — guard array/field shapes so a malformed
// payload yields an empty list instead of throwing in render.

export interface Preset {
  id: string;
  name: string;
  title: string | null;
  stylePrompt: string | null;
  lyricsPrompt: string | null;
  isInstrumental: boolean;
  customMode: boolean;
}

function asString(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function mapPreset(raw: unknown): Preset | null {
  if (typeof raw !== "object" || raw === null) return null;
  const r = raw as Record<string, unknown>;
  if (typeof r.id !== "string") return null;
  return {
    id: r.id,
    name: typeof r.name === "string" ? r.name : "Untitled preset",
    title: asString(r.title),
    stylePrompt: asString(r.stylePrompt),
    lyricsPrompt: asString(r.lyricsPrompt),
    isInstrumental: r.isInstrumental === true,
    customMode: r.customMode === true,
  };
}

export async function fetchPresets(): Promise<Preset[]> {
  const data = await apiGet<{ presets?: unknown }>("/api/presets");
  const list = Array.isArray(data?.presets) ? data.presets : [];
  return list.map(mapPreset).filter((p): p is Preset => p !== null);
}
