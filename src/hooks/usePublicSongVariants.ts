"use client";

import { useCallback, useState } from "react";
export interface SerializedPublicVariant {
  id: string;
  title: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
  tags: string | null;
  publicSlug: string | null;
  createdAt: string;
}

interface VariantState {
  activeSongId: string;
  activeTitle: string;
  activeImageUrl: string | null;
  activeAudioUrl: string | null;
  activeTags: string | null;
}

interface UsePublicSongVariantsOptions {
  songId: string;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  duration: number | null;
  tags: string | null;
  onBeforeSwitch?: () => void;
  onAfterSwitch?: () => void;
}

export function usePublicSongVariants({
  songId,
  title,
  imageUrl,
  audioUrl,
  duration,
  tags,
  onBeforeSwitch,
  onAfterSwitch,
}: UsePublicSongVariantsOptions) {
  const [state, setState] = useState<VariantState>({
    activeSongId: songId,
    activeTitle: title,
    activeImageUrl: imageUrl,
    activeAudioUrl: audioUrl,
    activeTags: tags,
  });

  const handleVariantSwitch = useCallback(
    (variant: SerializedPublicVariant) => {
      if (variant.id === state.activeSongId) return;

      onBeforeSwitch?.();

      setState({
        activeSongId: variant.id,
        activeTitle: variant.title ?? "Untitled",
        activeImageUrl: variant.imageUrl,
        activeAudioUrl: variant.audioUrl,
        activeTags: variant.tags,
      });

      onAfterSwitch?.();

      if (variant.publicSlug) {
        window.history.replaceState(null, "", `/s/${variant.publicSlug}`);
      }
    },
    [state.activeSongId, onBeforeSwitch, onAfterSwitch],
  );

  return {
    ...state,
    handleVariantSwitch,
  };
}
