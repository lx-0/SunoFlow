"use client";

import { useRouter } from "next/navigation";
import {
  ArrowLeftIcon,
  HeartIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { CoverArtImage } from "../CoverArtImage";

interface SongHeroSectionProps {
  songId: string;
  title: string;
  isHidden: boolean;
  coverImageUrl: string | null;
  generatedFallbackUrl: string;
  isFavorite: boolean;
  favoriteCount: number;
  onToggleFavorite: () => void;
  onOpenCoverArt: () => void;
}

export function SongHeroSection({
  songId,
  title,
  isHidden,
  coverImageUrl,
  generatedFallbackUrl,
  isFavorite,
  favoriteCount,
  onToggleFavorite,
  onOpenCoverArt,
}: SongHeroSectionProps) {
  const router = useRouter();

  return (
    <div className="relative w-full overflow-hidden rounded-b-3xl mb-6">
      {(coverImageUrl || generatedFallbackUrl) && (
        <div className="absolute inset-0">
          <CoverArtImage
            src={coverImageUrl || generatedFallbackUrl}
            alt=""
            fill
            className="object-cover scale-110 blur-2xl opacity-60"
            sizes="100vw"
            priority
            fallbackSrc={generatedFallbackUrl}
            songId={songId}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-gray-50/30 via-gray-50/50 to-gray-50 dark:from-gray-950/30 dark:via-gray-950/50 dark:to-gray-950" />
        </div>
      )}

      <div className="relative px-4 pt-4 pb-6 space-y-4">
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors min-h-[44px]"
        >
          <ArrowLeftIcon className="w-4 h-4" aria-hidden="true" />
          Back
        </button>

        <div className="relative w-full aspect-square max-h-80 sm:max-h-[400px] rounded-2xl bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center shadow-xl ring-1 ring-black/5 dark:ring-white/10 mx-auto group">
          <CoverArtImage
            src={coverImageUrl || generatedFallbackUrl}
            alt={title}
            fill
            className="object-cover"
            sizes="(max-width: 768px) 100vw, 400px"
            priority
            fallbackSrc={generatedFallbackUrl}
            songId={songId}
          />
          <button
            onClick={onOpenCoverArt}
            className="absolute inset-0 flex items-end justify-center pb-3 bg-black/0 group-hover:bg-black/30 transition-colors"
            aria-label="Change cover art"
          >
            <span className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 px-3 py-1.5 bg-black/70 text-white text-xs font-medium rounded-full">
              <PaintBrushIcon className="w-3.5 h-3.5" />
              {coverImageUrl ? "Change Cover" : "Generate Cover"}
            </span>
          </button>
        </div>

        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white flex-1">
              {title}
              {isHidden && (
                <span className="ml-2 inline-block text-xs font-medium px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 align-middle">
                  Hidden
                </span>
              )}
            </h1>
            <button
              onClick={onToggleFavorite}
              aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
              className={`flex-shrink-0 flex items-center gap-1 px-2 h-11 rounded-full transition-all duration-200 active:scale-95 ${
                isFavorite ? "text-pink-500" : "text-gray-400 dark:text-gray-500 hover:text-pink-400"
              }`}
            >
              {isFavorite ? (
                <HeartIcon className="w-6 h-6" />
              ) : (
                <HeartOutlineIcon className="w-6 h-6" />
              )}
              {favoriteCount > 0 && (
                <span className="text-sm font-medium">{favoriteCount}</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
