"use client";

import { useCallback, useState } from "react";
import type { SerializedPublicVariant } from "./PublicSongView";

interface VariantState {
  activeSongId: string;
  activeTitle: string;
  activeImageUrl: string | null;
  activeAudioUrl: string | null;
  activeTags: string | null;
}

export function useVariantSwitcher(initial: {
  songId: string;
  title: string;
  imageUrl: string | null;
  audioUrl: string | null;
  tags: string | null;
}) {
  const [state, setState] = useState<VariantState>({
    activeSongId: initial.songId,
    activeTitle: initial.title,
    activeImageUrl: initial.imageUrl,
    activeAudioUrl: initial.audioUrl,
    activeTags: initial.tags,
  });

  const handleVariantSwitch = useCallback(
    (
      variant: SerializedPublicVariant,
      onSwitch: () => void
    ) => {
      if (variant.id === state.activeSongId) return;

      setState({
        activeSongId: variant.id,
        activeTitle: variant.title ?? "Untitled",
        activeImageUrl: variant.imageUrl,
        activeAudioUrl: variant.audioUrl,
        activeTags: variant.tags,
      });

      onSwitch();

      if (variant.publicSlug) {
        window.history.replaceState(null, "", `/s/${variant.publicSlug}`);
      }
    },
    [state.activeSongId]
  );

  const resolvedAudioUrl = state.activeSongId
    ? `/api/audio/public/${state.activeSongId}`
    : state.activeAudioUrl;

  return {
    ...state,
    resolvedAudioUrl,
    handleVariantSwitch,
  };
}
