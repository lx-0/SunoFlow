import { asBool, asRecord, asString, unwrapList } from "@sunoflow/core";
import { apiGet, apiPost, apiDelete } from "@/api/client";

export const PRESET_NAME_MAX = 100;

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

function mapPreset(raw: unknown): Preset | null {
  const r = asRecord(raw);
  const id = r ? asString(r.id) : null;
  if (!r || !id) return null;
  return {
    id,
    name: asString(r.name) ?? "Untitled preset",
    title: asString(r.title),
    stylePrompt: asString(r.stylePrompt),
    lyricsPrompt: asString(r.lyricsPrompt),
    isInstrumental: asBool(r.isInstrumental),
    customMode: asBool(r.customMode),
  };
}

export async function fetchPresets(): Promise<Preset[]> {
  const data = await apiGet<unknown>("/api/presets");
  return unwrapList(data, "presets", mapPreset);
}

// Create a preset from a Generate config. Mirrors web POST /api/presets:
// name required (<=100), everything else nullish/optional.
export async function createPreset(input: {
  name: string;
  title?: string | null;
  stylePrompt?: string | null;
  lyricsPrompt?: string | null;
  isInstrumental?: boolean;
  customMode?: boolean;
}): Promise<void> {
  await apiPost("/api/presets", { ...input, name: input.name.trim() });
}

export async function deletePreset(id: string): Promise<void> {
  await apiDelete(`/api/presets/${id}`);
}
