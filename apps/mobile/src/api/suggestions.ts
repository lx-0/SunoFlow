import { apiGet } from "./client";

// One-tap style suggestions for the Generate screen — mirrors the web GenerateForm's
// "Suggested for you" + "Trending Combos" panels.
//   GET /api/suggestions/prompts  -> { suggestions: PromptSuggestion[] }
//   GET /api/suggestions/trending -> { trending: TrendingStyleCombo[] }
// Both return the value directly (NextResponse.json), no envelope wrapper. Map
// defensively — never throw on shape.

export interface PromptSuggestion {
  id: string;
  label: string;
  stylePrompt: string;
  isInstrumental: boolean;
  source: "personal" | "community" | "curated";
}

export interface TrendingCombo {
  id: string;
  label: string;
  stylePrompt: string;
  displayScore: string;
}

function rec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}
function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

export async function fetchPromptSuggestions(): Promise<PromptSuggestion[]> {
  const res = await apiGet<{ suggestions?: unknown[] }>("/api/suggestions/prompts");
  const list = Array.isArray(res?.suggestions) ? res.suggestions : [];
  return list
    .map((raw) => {
      const r = rec(raw);
      const id = str(r.id);
      const stylePrompt = str(r.stylePrompt);
      if (!id || !stylePrompt) return null;
      const source = r.source === "personal" || r.source === "community" || r.source === "curated"
        ? r.source
        : "curated";
      return {
        id,
        label: str(r.label) || stylePrompt,
        stylePrompt,
        isInstrumental: r.isInstrumental === true,
        source,
      } as PromptSuggestion;
    })
    .filter((s): s is PromptSuggestion => s !== null);
}

export async function fetchTrendingCombos(): Promise<TrendingCombo[]> {
  const res = await apiGet<{ trending?: unknown[] }>("/api/suggestions/trending");
  const list = Array.isArray(res?.trending) ? res.trending : [];
  return list
    .map((raw) => {
      const r = rec(raw);
      const id = str(r.id);
      const stylePrompt = str(r.stylePrompt);
      if (!id || !stylePrompt) return null;
      return {
        id,
        label: str(r.label) || str(r.combo) || stylePrompt,
        stylePrompt,
        displayScore: str(r.displayScore),
      } as TrendingCombo;
    })
    .filter((c): c is TrendingCombo => c !== null);
}
