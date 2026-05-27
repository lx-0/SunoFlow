"use client";

import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api-client";
import type {
  CreditInfo,
  GenerationPreset,
  PersonaOption,
  PromptSuggestion,
  PromptTemplate,
  RateLimitStatus,
  StyleTemplate,
  TrendingStyleCombo,
} from "./types";

export const generateFormKeys = {
  rateLimit: ["generate-form", "rate-limit"] as const,
  credits: ["generate-form", "credits"] as const,
  personas: ["generate-form", "personas"] as const,
  templates: ["generate-form", "templates"] as const,
  presets: ["generate-form", "presets"] as const,
  styleTemplates: ["generate-form", "style-templates"] as const,
  suggestions: ["generate-form", "suggestions"] as const,
  trending: ["generate-form", "trending"] as const,
};

export function useRateLimitQuery() {
  return useQuery({
    queryKey: generateFormKeys.rateLimit,
    queryFn: () => apiGet<RateLimitStatus>("/api/rate-limit"),
  });
}

export function useGenerateFormCredits() {
  return useQuery({
    queryKey: generateFormKeys.credits,
    queryFn: async () => {
      const data = await apiGet<{
        creditsRemaining: number;
        budget: number;
        usagePercent: number;
        isLow: boolean;
      }>("/api/credits");
      return {
        creditsRemaining: data.creditsRemaining,
        budget: data.budget,
        usagePercent: data.usagePercent,
        isLow: data.isLow,
      } satisfies CreditInfo;
    },
  });
}

export function usePersonasQuery() {
  return useQuery({
    queryKey: generateFormKeys.personas,
    queryFn: async () => {
      const data = await apiGet<{ personas?: PersonaOption[] }>("/api/personas");
      return data.personas ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePromptTemplatesQuery() {
  return useQuery({
    queryKey: generateFormKeys.templates,
    queryFn: async () => {
      const data = await apiGet<{ templates?: PromptTemplate[]; categories?: string[] }>(
        "/api/prompt-templates",
      );
      return {
        templates: data.templates ?? [],
        categories: data.categories ?? [],
      };
    },
  });
}

export function usePresetsQuery() {
  return useQuery({
    queryKey: generateFormKeys.presets,
    queryFn: async () => {
      const data = await apiGet<{ presets?: GenerationPreset[] }>("/api/presets");
      return data.presets ?? [];
    },
  });
}

export function useStyleTemplatesQuery() {
  return useQuery({
    queryKey: generateFormKeys.styleTemplates,
    queryFn: async () => {
      const data = await apiGet<{ templates?: StyleTemplate[] }>("/api/style-templates");
      return data.templates ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function usePromptSuggestionsQuery() {
  return useQuery({
    queryKey: generateFormKeys.suggestions,
    queryFn: async () => {
      const data = await apiGet<{ suggestions?: PromptSuggestion[] }>("/api/suggestions/prompts");
      return data.suggestions ?? [];
    },
    staleTime: 5 * 60_000,
  });
}

export function useTrendingCombosQuery() {
  return useQuery({
    queryKey: generateFormKeys.trending,
    queryFn: async () => {
      const data = await apiGet<{ trending?: TrendingStyleCombo[] }>("/api/suggestions/trending");
      return data.trending ?? [];
    },
    staleTime: 60_000,
  });
}
