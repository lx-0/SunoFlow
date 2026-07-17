import { asBool, asRecord, asString, unwrapList } from "@sunoflow/core";
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

export async function fetchPromptSuggestions(): Promise<PromptSuggestion[]> {
  const res = await apiGet<unknown>("/api/suggestions/prompts");
  return unwrapList(res, "suggestions", (raw): PromptSuggestion | null => {
    const r = asRecord(raw);
    const id = r ? asString(r.id) : null;
    const stylePrompt = r ? asString(r.stylePrompt) : null;
    if (!r || !id || !stylePrompt) return null;
    const source =
      r.source === "personal" || r.source === "community" || r.source === "curated"
        ? r.source
        : "curated";
    return {
      id,
      label: asString(r.label) ?? stylePrompt,
      stylePrompt,
      isInstrumental: asBool(r.isInstrumental),
      source,
    };
  });
}

export async function fetchTrendingCombos(): Promise<TrendingCombo[]> {
  const res = await apiGet<unknown>("/api/suggestions/trending");
  return unwrapList(res, "trending", (raw): TrendingCombo | null => {
    const r = asRecord(raw);
    const id = r ? asString(r.id) : null;
    const stylePrompt = r ? asString(r.stylePrompt) : null;
    if (!r || !id || !stylePrompt) return null;
    return {
      id,
      label: asString(r.label) ?? asString(r.combo) ?? stylePrompt,
      stylePrompt,
      displayScore: asString(r.displayScore, ""),
    };
  });
}
