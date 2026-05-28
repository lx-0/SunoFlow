"use client";

import type { SunoSong } from "@/lib/sunoapi";
import { useSongFavorite } from "@/hooks/song-actions/use-song-favorite";
import { useSongRating } from "@/hooks/song-actions/use-song-rating";
import { useSongFeedback } from "@/hooks/song-actions/use-song-feedback";
import { useSongVisibility } from "@/hooks/song-actions/use-song-visibility";
import { useSongArchive } from "@/hooks/song-actions/use-song-archive";
import { useSongAppeal } from "@/hooks/song-actions/use-song-appeal";
import { useSongVariations } from "@/hooks/song-actions/use-song-variations";
import { useSongExport } from "@/hooks/song-actions/use-song-export";
import { useSongStyleTemplate } from "@/hooks/song-actions/use-song-style-template";

export type { CompareVariation } from "@/hooks/song-actions/use-song-variations";

type ToastFn = (message: string, type?: "success" | "error" | "info") => void;

interface UseSongActionsParams {
  song: SunoSong;
  initialFavorite: boolean;
  initialFavoriteCount: number;
  initialIsPublic: boolean;
  initialPublicSlug: string | null;
  initialRating: number | null;
  initialRatingNote: string | null;
  initialIsArchived: boolean;
  initialVariationCount: number;
  maxVariations: number;
  toast: ToastFn;
}

export function useSongActions({
  song,
  initialFavorite,
  initialFavoriteCount,
  initialIsPublic,
  initialPublicSlug,
  initialRating,
  initialRatingNote,
  initialIsArchived,
  initialVariationCount,
  maxVariations,
  toast,
}: UseSongActionsParams) {
  const favorite = useSongFavorite({
    songId: song.id,
    initialFavorite,
    initialFavoriteCount,
    toast,
  });

  const rating = useSongRating({
    songId: song.id,
    initialRating,
    initialRatingNote,
    toast,
  });

  const feedback = useSongFeedback({ songId: song.id, toast });

  const visibility = useSongVisibility({
    songId: song.id,
    songTitle: song.title,
    initialIsPublic,
    initialPublicSlug,
    toast,
  });

  const archive = useSongArchive({
    songId: song.id,
    initialIsArchived,
    toast,
  });

  const appeal = useSongAppeal({ songId: song.id, toast });

  const variations = useSongVariations({
    songId: song.id,
    initialVariationCount,
    maxVariations,
    toast,
  });

  const songExport = useSongExport({
    songId: song.id,
    initialVideoUrl: song.videoUrl ?? null,
    toast,
  });

  const styleTemplate = useSongStyleTemplate({
    songId: song.id,
    songTags: song.tags ?? null,
    toast,
  });

  return {
    ...favorite,
    ...rating,
    ...feedback,
    ...visibility,
    ...archive,
    ...appeal,
    ...variations,
    ...songExport,
    ...styleTemplate,
  };
}
