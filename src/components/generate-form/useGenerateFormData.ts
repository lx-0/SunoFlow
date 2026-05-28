"use client";

import { useCallback, useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import type {
  CreditInfo,
  GenerationPreset,
  PromptTemplate,
  RateLimitStatus,
} from "./types";
import {
  generateFormKeys,
  useGenerateFormCredits,
  usePersonasQuery,
  usePresetsQuery,
  usePromptSuggestionsQuery,
  usePromptTemplatesQuery,
  useRateLimitQuery,
  useStyleTemplatesQuery,
  useTrendingCombosQuery,
} from "./queries";

interface UseGenerateFormDataOptions {
  toast: (message: string, type: "info" | "success" | "error") => void;
}

export function useGenerateFormData({ toast }: UseGenerateFormDataOptions) {
  const queryClient = useQueryClient();
  const shownLimitToast = useRef(false);

  const rateLimitQuery = useRateLimitQuery();
  const creditsQuery = useGenerateFormCredits();
  const personasQuery = usePersonasQuery();
  const templatesQuery = usePromptTemplatesQuery();
  const presetsQuery = usePresetsQuery();
  const styleTemplatesQuery = useStyleTemplatesQuery();
  const suggestionsQuery = usePromptSuggestionsQuery();
  const trendingQuery = useTrendingCombosQuery();

  const rateLimit = rateLimitQuery.data ?? null;

  useEffect(() => {
    if (!rateLimit) return;
    const used = rateLimit.limit - rateLimit.remaining;
    const pct = rateLimit.limit > 0 ? used / rateLimit.limit : 0;
    if (pct >= 0.8 && rateLimit.remaining > 0 && !shownLimitToast.current) {
      shownLimitToast.current = true;
      toast(
        `${rateLimit.remaining} generation${rateLimit.remaining === 1 ? "" : "s"} remaining this hour`,
        "info",
      );
    }
  }, [rateLimit, toast]);

  const setRateLimit = useCallback(
    (data: RateLimitStatus) => {
      queryClient.setQueryData(generateFormKeys.rateLimit, data);
    },
    [queryClient],
  );

  const setTemplates = useCallback(
    (updater: (prev: PromptTemplate[]) => PromptTemplate[]) => {
      queryClient.setQueryData(
        generateFormKeys.templates,
        (old: { templates: PromptTemplate[]; categories: string[] } | undefined) => {
          if (!old) return old;
          return { ...old, templates: updater(old.templates) };
        },
      );
    },
    [queryClient],
  );

  const setPresets = useCallback(
    (updater: (prev: GenerationPreset[]) => GenerationPreset[]) => {
      queryClient.setQueryData(generateFormKeys.presets, (old: GenerationPreset[] | undefined) =>
        old ? updater(old) : old,
      );
    },
    [queryClient],
  );

  const fetchCredits = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: generateFormKeys.credits });
  }, [queryClient]);

  const fetchTemplates = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: generateFormKeys.templates });
  }, [queryClient]);

  const templateData = templatesQuery.data;

  return {
    rateLimit,
    setRateLimit,
    templates: templateData?.templates ?? [],
    setTemplates,
    categories: templateData?.categories ?? [],
    presets: presetsQuery.data ?? [],
    setPresets,
    suggestions: suggestionsQuery.data ?? [],
    trendingCombos: trendingQuery.data ?? [],
    personas: personasQuery.data ?? [],
    styleTemplates: styleTemplatesQuery.data ?? [],
    creditInfo: creditsQuery.data ?? null as CreditInfo | null,
    fetchCredits,
    fetchTemplates,
  };
}
