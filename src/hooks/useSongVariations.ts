"use client";

import { useState } from "react";
import { type RemixAction } from "@/components/RemixModal";

interface VariationSummary {
  id: string;
  title: string | null;
  prompt: string | null;
  tags: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  lyrics: string | null;
  generationStatus: string;
  isInstrumental: boolean;
  createdAt: string | Date;
}

interface UseSongVariationsOptions {
  songId: string;
  variationCount: number;
  maxVariations: number;
  toast: (message: string, variant?: "success" | "error" | "info") => void;
  onCreated?: (newSongId: string) => void;
}

export function useSongVariations({
  songId,
  variationCount,
  maxVariations,
  toast,
  onCreated,
}: UseSongVariationsOptions) {
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [creatingVariation, setCreatingVariation] = useState(false);
  const [compareVariation, setCompareVariation] = useState<VariationSummary | null>(null);
  const [remixAction, setRemixAction] = useState<RemixAction | null>(null);
  const [remixSubmitting, setRemixSubmitting] = useState(false);

  function openVariationModal() {
    if (variationCount >= maxVariations) {
      toast(`Maximum ${maxVariations} variations reached`, "error");
      return;
    }
    setVariationModalOpen(true);
  }

  async function handleCreateVariation(data: { prompt: string; tags: string; lyrics: string; title: string; makeInstrumental: boolean }) {
    if (creatingVariation) return;
    if (variationCount >= maxVariations) {
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
      onCreated?.(result.song.id);
    } catch {
      toast("Failed to create variation", "error");
    } finally {
      setCreatingVariation(false);
    }
  }

  async function handleRemixSubmit(action: RemixAction, data: Record<string, string | number | undefined>) {
    if (remixSubmitting) return;
    if (variationCount >= maxVariations) {
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
      onCreated?.(result.song.id);
    } catch {
      toast("Generation failed", "error");
    } finally {
      setRemixSubmitting(false);
    }
  }

  function toggleCompareVariation(v: VariationSummary) {
    setCompareVariation(compareVariation?.id === v.id ? null : v);
  }

  return {
    variationModalOpen,
    setVariationModalOpen,
    creatingVariation,
    compareVariation,
    setCompareVariation,
    remixAction,
    setRemixAction,
    remixSubmitting,
    openVariationModal,
    handleCreateVariation,
    handleRemixSubmit,
    toggleCompareVariation,
    atVariationLimit: variationCount >= maxVariations,
  };
}
