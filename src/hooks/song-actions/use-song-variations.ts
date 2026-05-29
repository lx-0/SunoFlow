"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import type { RemixAction } from "@/components/RemixModal";

export interface CompareVariation {
  id: string;
  title: string | null;
  tags: string | null;
  audioUrl: string | null;
  duration: number | null;
  lyrics: string | null;
}

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

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
  const [creatingVariation, setCreatingVariation] = useState(false);
  const [compareVariation, setCompareVariation] = useState<CompareVariation | null>(null);
  const [remixAction, setRemixAction] = useState<RemixAction | null>(null);
  const [remixSubmitting, setRemixSubmitting] = useState(false);

  const handleCreateVariation = useCallback(async (data: {
    prompt: string;
    tags: string;
    lyrics: string;
    title: string;
    makeInstrumental: boolean;
  }) => {
    if (creatingVariation) return;
    if (initialVariationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setCreatingVariation(true);
    try {
      const res = await fetch(`/api/songs/${songId}/variations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: data.prompt || undefined,
          tags: data.tags || undefined,
          title: data.title || undefined,
          makeInstrumental: data.makeInstrumental,
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error ?? "Failed to create variation", "error");
        return;
      }
      toast("Variation generation started!", "success");
      setVariationModalOpen(false);
      router.push(`/library/${result.song.id}`);
    } catch {
      toast("Failed to create variation", "error");
    } finally {
      setCreatingVariation(false);
    }
  }, [creatingVariation, initialVariationCount, maxVariations, songId, toast, router]);

  const handleRemixSubmit = useCallback(async (
    action: RemixAction,
    data: Record<string, string | number | undefined>,
  ) => {
    if (remixSubmitting) return;
    if (initialVariationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setRemixSubmitting(true);
    try {
      const res = await fetch(`/api/songs/${songId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) {
        toast(result.error ?? "Generation failed", "error");
        return;
      }
      toast("Generation started!", "success");
      setRemixAction(null);
      router.push(`/library/${result.song.id}`);
    } catch {
      toast("Generation failed", "error");
    } finally {
      setRemixSubmitting(false);
    }
  }, [remixSubmitting, initialVariationCount, maxVariations, songId, toast, router]);

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
