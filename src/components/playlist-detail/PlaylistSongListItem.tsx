"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  PlayIcon,
  PauseIcon,
  MusicalNoteIcon,
  TrashIcon,
  Bars3Icon,
  ForwardIcon,
  QueueListIcon,
} from "@heroicons/react/24/outline";
import { CheckIcon } from "@heroicons/react/24/solid";
import { formatDuration as formatTime } from "@/lib/time-format";
import type { PlaylistSongItem } from "./types";

interface PlaylistSongListItemProps {
  ps: PlaylistSongItem;
  index: number;
  isActive: boolean;
  hasAudio: boolean;
  isDragOver: boolean;
  dragIndex: number | null;
  isSelected: boolean;
  selectionMode: boolean;
  isPlaying: boolean;
  isCollaborative: boolean;
  onDragStart: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onDragEnd: () => void;
  onDragHandleTouchStart: () => void;
  onKeyboardReorder: (direction: "up" | "down") => void;
  isFirst: boolean;
  isLast: boolean;
  onTogglePlay: () => void;
  onPlayNext: () => void;
  onAddToQueue: () => void;
  onRemove: () => void;
  onToggleSelect: () => void;
  onLongPress: () => void;
}

export function PlaylistSongListItem({
  ps, index, isActive, hasAudio, isDragOver, dragIndex, isSelected, selectionMode, isPlaying, isCollaborative,
  onDragStart, onDragOver, onDrop, onDragEnd, onDragHandleTouchStart, onKeyboardReorder, isFirst, isLast,
  onTogglePlay, onPlayNext, onAddToQueue, onRemove, onToggleSelect, onLongPress,
}: PlaylistSongListItemProps) {
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const target = e.target as HTMLElement;
    if (target.closest("[data-drag-handle]")) return;
    const t = e.touches[0];
    touchStartPos.current = { x: t.clientX, y: t.clientY };
    longPressTimer.current = setTimeout(() => { onLongPress(); }, 500);
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (!touchStartPos.current || !longPressTimer.current) return;
    const t = e.touches[0];
    if (Math.abs(t.clientX - touchStartPos.current.x) > 10 || Math.abs(t.clientY - touchStartPos.current.y) > 10) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }
  function handleTouchEnd() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
    touchStartPos.current = null;
  }

  return (
    <li
      data-drag-index={index}
      draggable={!selectionMode}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      className={`flex items-center gap-2 sm:gap-3 px-2 sm:px-3 py-2.5 rounded-xl transition-colors ${
        isSelected
          ? "border border-violet-500 bg-violet-50 dark:bg-violet-950/30"
          : isActive
            ? "bg-violet-50 dark:bg-violet-900/20 border border-violet-300 dark:border-violet-700"
            : "bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
      } ${isDragOver && !selectionMode ? "border-violet-400 dark:border-violet-500" : ""} ${
        dragIndex === index ? "opacity-50" : ""
      }`}
    >
      {selectionMode ? (
        <button
          onClick={onToggleSelect}
          aria-label={isSelected ? "Deselect song" : "Select song"}
          className={`flex-shrink-0 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
            isSelected ? "bg-violet-600 border-violet-600 text-white" : "border-gray-300 dark:border-gray-600 hover:border-violet-400"
          }`}
        >
          {isSelected && <CheckIcon className="w-4 h-4" />}
        </button>
      ) : (
        <div
          data-drag-handle
          tabIndex={0}
          role="button"
          aria-label={`Reorder ${ps.song.title ?? "song"}. Press arrow keys to move up or down.`}
          aria-disabled={isFirst && isLast}
          className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-300 dark:text-gray-600 min-w-[44px] min-h-[44px] flex items-center justify-center touch-none focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500 rounded"
          onTouchStart={onDragHandleTouchStart}
          onKeyDown={(e) => {
            if (e.key === "ArrowUp") { e.preventDefault(); onKeyboardReorder("up"); }
            else if (e.key === "ArrowDown") { e.preventDefault(); onKeyboardReorder("down"); }
          }}
        >
          <Bars3Icon className="w-5 h-5" />
        </div>
      )}

      <span className="flex-shrink-0 w-6 text-xs text-gray-400 dark:text-gray-500 text-center hidden sm:block">
        {index + 1}
      </span>

      <div className="relative flex-shrink-0 w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
        {ps.song.imageUrl ? (
          <Image src={ps.song.imageUrl} alt={ps.song.title ?? "Song"} fill className="object-cover" sizes="40px" loading="lazy" />
        ) : (
          <MusicalNoteIcon className="w-5 h-5 text-gray-400 dark:text-gray-600" />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <Link
          href={`/library/${ps.songId}`}
          className="block text-sm font-medium text-gray-900 dark:text-white truncate hover:text-violet-400 transition-colors"
        >
          {ps.song.title ?? "Untitled"}
        </Link>
        <div className="flex items-center gap-1.5">
          {ps.song.duration && (
            <span className="text-xs text-gray-400 dark:text-gray-500">{formatTime(ps.song.duration)}</span>
          )}
          {isCollaborative && ps.addedByUser?.name && (
            <span className="text-xs text-gray-400 dark:text-gray-500 truncate">
              · {ps.addedByUser.name}
            </span>
          )}
        </div>
      </div>

      <button
        onClick={onTogglePlay}
        disabled={!hasAudio}
        aria-label={isActive && isPlaying ? "Pause" : "Play"}
        className={`flex-shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
          hasAudio
            ? "bg-violet-600 hover:bg-violet-500 text-white"
            : "bg-gray-200 dark:bg-gray-800 text-gray-400 cursor-not-allowed"
        }`}
      >
        {isActive && isPlaying ? <PauseIcon className="w-5 h-5" /> : <PlayIcon className="w-5 h-5 ml-0.5" />}
      </button>

      {hasAudio && !selectionMode && (
        <div className="hidden sm:flex items-center gap-0.5">
          <button
            onClick={onPlayNext}
            aria-label={`Play ${ps.song.title ?? "song"} next`}
            title="Play Next"
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
          >
            <ForwardIcon className="w-4 h-4" />
          </button>
          <button
            onClick={onAddToQueue}
            aria-label={`Add ${ps.song.title ?? "song"} to queue`}
            title="Add to Queue"
            className="flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-violet-400 transition-colors"
          >
            <QueueListIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {!selectionMode && (
        <button
          onClick={onRemove}
          aria-label="Remove from playlist"
          className="flex-shrink-0 w-11 h-11 rounded-full hidden sm:flex items-center justify-center text-gray-400 dark:text-gray-500 hover:text-red-500 transition-colors"
        >
          <TrashIcon className="w-4 h-4" />
        </button>
      )}
    </li>
  );
}
