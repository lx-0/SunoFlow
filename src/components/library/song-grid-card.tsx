import { useRef } from "react";
import type { Song } from "@prisma/client";
import Link from "next/link";
import Image from "next/image";
import {
  CheckIcon,
  MusicalNoteIcon,
  PauseIcon,
  PlayIcon,
  HeartIcon,
} from "@heroicons/react/24/solid";
import { HeartIcon as HeartOutlineIcon } from "@heroicons/react/24/outline";
import { HighlightText } from "@/components/HighlightText";
import { ShareButton } from "@/components/ShareButton";

interface SongGridCardProps {
  song: Song;
  isActive: boolean;
  isPlaying: boolean;
  isSelected: boolean;
  selectionMode: boolean;
  searchQuery?: string;
  priority?: boolean;
  onTogglePlay: (song: Song) => void;
  onToggleFavorite: (song: Song) => void;
  onToggleSelect: (songId: string) => void;
  onLongPress: (songId: string) => void;
}

export function SongGridCard({
  song,
  isActive,
  isPlaying,
  isSelected,
  selectionMode,
  searchQuery = "",
  priority = false,
  onTogglePlay,
  onToggleFavorite,
  onToggleSelect,
  onLongPress,
}: SongGridCardProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    longPressTimer.current = setTimeout(() => {
      onLongPress(song.id);
    }, 500);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const t = e.touches[0];
    if (
      Math.abs(t.clientX - touchStartPos.current.x) > 10 ||
      Math.abs(t.clientY - touchStartPos.current.y) > 10
    ) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }

  function handleTouchEnd() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    touchStartPos.current = null;
  }

  return (
    <li
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`group relative bg-white dark:bg-gray-900 rounded-xl border overflow-hidden transition-colors ${
        isSelected
          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
          : "border-gray-200 dark:border-gray-800 hover:border-violet-300 dark:hover:border-violet-700"
      }`}
    >
      <button
        onClick={() => onToggleSelect(song.id)}
        aria-label={isSelected ? "Deselect song" : "Select song"}
        className={`absolute top-2 left-2 z-10 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
          selectionMode ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        } ${
          isSelected
            ? "bg-violet-600 border-violet-600 text-white"
            : "border-white bg-black/20 hover:border-violet-400"
        }`}
      >
        {isSelected && <CheckIcon className="w-4 h-4" />}
      </button>

      <div className="relative aspect-square bg-gray-100 dark:bg-gray-800">
        {song.imageUrl ? (
          <Image
            src={song.imageUrl}
            alt={song.title ?? "Song cover"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            priority={priority}
            loading={priority ? "eager" : "lazy"}
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIHZpZXdCb3g9IjAgMCAxMCAxMCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAiIGhlaWdodD0iMTAiIGZpbGw9IiM3YzNhZWQiIGZpbGwtb3BhY2l0eT0iMC4yIi8+PC9zdmc+"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <MusicalNoteIcon className="w-10 h-10 text-gray-300 dark:text-gray-700" aria-hidden="true" />
          </div>
        )}

        <button
          onClick={() => onTogglePlay(song)}
          aria-label={isActive && isPlaying ? "Pause" : "Play"}
          className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors"
        >
          <span
            className={`flex items-center justify-center w-12 h-12 rounded-full bg-white/90 shadow-lg transition-opacity ${
              isActive ? "opacity-100" : "opacity-0 group-hover:opacity-100"
            }`}
          >
            {isActive && isPlaying ? (
              <PauseIcon className="w-6 h-6 text-violet-600" />
            ) : (
              <PlayIcon className="w-6 h-6 text-violet-600 ml-0.5" />
            )}
          </span>
        </button>

        {isActive && isPlaying && (
          <div className="absolute bottom-2 left-2 flex items-end gap-0.5" aria-hidden="true">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className="w-1 bg-violet-400 rounded-full animate-pulse"
                style={{ height: `${8 + i * 4}px`, animationDelay: `${i * 0.1}s` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-3 py-2 flex items-center justify-between gap-2">
        <Link
          href={`/library/${song.id}`}
          className="text-sm font-medium text-gray-900 dark:text-white truncate hover:text-violet-600 dark:hover:text-violet-400 transition-colors min-w-0"
        >
          <HighlightText text={song.title ?? "Untitled"} query={searchQuery} />
        </Link>
        <div className="flex items-center gap-1 flex-shrink-0">
          <ShareButton
            song={song}
            source="library_grid"
            className="text-gray-400 hover:text-violet-500 transition-colors"
          />
          <button
            onClick={() => onToggleFavorite(song)}
            aria-label={
              (song as Song & { isFavorite?: boolean }).isFavorite
                ? "Remove from favorites"
                : "Add to favorites"
            }
            className="flex-shrink-0 text-gray-400 hover:text-red-500 transition-colors"
          >
            {(song as Song & { isFavorite?: boolean }).isFavorite ? (
              <HeartIcon className="w-4 h-4 text-red-500" />
            ) : (
              <HeartOutlineIcon className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </li>
  );
}
