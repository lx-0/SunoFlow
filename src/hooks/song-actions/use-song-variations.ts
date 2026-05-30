"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAsyncAction } from "@/hooks/useAsyncAction";
import type { RemixAction } from "@/components/RemixModal";
import { type ToastFn } from "@/components/Toast";
import { callApi, jsonPost } from "./call-api";

export interface CompareVariation {
  id: string;
  title: string | null;
  tags: string | null;
  audioUrl: string | null;
  duration: number | null;
  lyrics: string | null;
}


interface UseSongVariationsParams {
  songId: string;
  initialVariationCount: number;
  maxVariations: number;
  toast: ToastFn;
}

export function useSongVariations({
  songId,
  initialVariationCount,
  maxVariations,
  toast,
}: UseSongVariationsParams) {
  const router = useRouter();
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [compareVariation, setCompareVariation] = useState<CompareVariation | null>(null);
  const [remixAction, setRemixAction] = useState<RemixAction | null>(null);

  const [handleCreateVariation, creatingVariation] = useAsyncAction(async (data: {
    prompt: string;
    tags: string;
    lyrics: string;
    title: string;
    makeInstrumental: boolean;
  }) => {
    if (initialVariationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    const result = await callApi<{ song: { id: string } }>(
      `/api/songs/${songId}/variations`,
      jsonPost({ prompt: data.prompt || undefined, tags: data.tags || undefined, title: data.title || undefined, makeInstrumental: data.makeInstrumental }),
      toast,
      "Failed to create variation",
    );
    if (!result) return;
    toast("Variation generation started!", "success");
    setVariationModalOpen(false);
    router.push(`/library/${result.song.id}`);
  });

  const [handleRemixSubmit, remixSubmitting] = useAsyncAction(async (
    action: RemixAction,
    data: Record<string, string | number | undefined>,
  ) => {
    if (initialVariationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    const result = await callApi<{ song: { id: string } }>(
      `/api/songs/${songId}/${action}`,
      jsonPost(data),
      toast,
      "Generation failed",
    );
    if (!result) return;
    toast("Generation started!", "success");
    setRemixAction(null);
    router.push(`/library/${result.song.id}`);
  });

  return {
    variationModalOpen,
    setVariationModalOpen,
    creatingVariation,
    compareVariation,
    setCompareVariation,
    remixAction,
    setRemixAction,
    remixSubmitting,
    handleCreateVariation,
    handleRemixSubmit,
  };
}
