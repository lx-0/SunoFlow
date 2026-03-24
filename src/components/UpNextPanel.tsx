"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import {
  XMarkIcon,
  TrashIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/solid";
import { Bars3Icon } from "@heroicons/react/24/outline";
import { useQueue } from "./QueueContext";

function formatTime(seconds: number | null): string {
  if (!seconds || isNaN(seconds) || !isFinite(seconds)) return "--:--";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

interface UpNextPanelProps {
  onClose: () => void;
}

export function UpNextPanel({ onClose }: UpNextPanelProps) {
  const { queue, currentIndex, removeFromQueue, reorderQueue, clearQueue } = useQueue();

  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const dragNodeRef = useRef<HTMLLIElement | null>(null);

  const currentSong = currentIndex >= 0 ? queue[currentIndex] : null;
  // upcoming = everything after currentIndex
  const upcomingCount = queue.length - (currentIndex + 1);

  function handleDragStart(e: React.DragEvent<HTMLLIElement>, upcomingIdx: number) {
    setDragIndex(upcomingIdx);
    e.dataTransfer.effectAllowed = "move";
    dragNodeRef.current = e.currentTarget;
    // slight opacity via a short timeout so the ghost image renders first
    setTimeout(() => {
      if (dragNodeRef.current) dragNodeRef.current.style.opacity = "0.4";
    }, 0);
  }

  function handleDragEnd() {
    if (dragNodeRef.current) dragNodeRef.current.style.opacity = "";
    setDragIndex(null);
    setDragOverIndex(null);
    dragNodeRef.current = null;
  }

  function handleDragOver(e: React.DragEvent, upcomingIdx: number) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverIndex !== upcomingIdx) setDragOverIndex(upcomingIdx);
  }

  function handleDrop(e: React.DragEvent, upcomingIdx: number) {
    e.preventDefault();
    if (dragIndex !== null && dragIndex !== upcomingIdx) {
      // Convert upcoming indices to absolute queue indices
      const fromQueueIdx = currentIndex + 1 + dragIndex;
      const toQueueIdx = currentIndex + 1 + upcomingIdx;
      reorderQueue(fromQueueIdx, toQueueIdx);
    }
    setDragIndex(null);
    setDragOverIndex(null);
  }

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-t-2xl shadow-2xl overflow-hidden" role="dialog" aria-label="Up Next queue">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div>
          <h2 className="text-sm font-semibold text-white">Up Next</h2>
          {upcomingCount > 0 && (
            <p className="text-xs text-gray-400">{upcomingCount} track{upcomingCount !== 1 ? "s" : ""} queued</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          {queue.length > 0 && (
            <button
              onClick={clearQueue}
              aria-label="Clear queue"
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-400 transition-colors rounded-full hover:bg-gray-800"
            >
              <TrashIcon className="w-4 h-4" />
            </button>
          )}
          <button
            onClick={onClose}
            aria-label="Close Up Next"
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors rounded-full hover:bg-gray-800"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="max-h-72 overflow-y-auto">
        {/* Now Playing */}
        {currentSong && (
          <div className="px-4 pt-3 pb-2">
            <p className="text-[10px] font-semibold text-violet-400 uppercase tracking-wider mb-2">Now Playing</p>
            <div className="flex items-center gap-3 px-2 py-2 bg-violet-900/20 border border-violet-800/40 rounded-lg">
              <div className="relative flex-shrink-0 w-8 h-8 rounded bg-gray-800 overflow-hidden flex items-center justify-center">
                {currentSong.imageUrl ? (
                  <Image src={currentSong.imageUrl} alt={currentSong.title ?? "Song"} fill className="object-cover" sizes="32px" />
                ) : (
                  <MusicalNoteIcon className="w-4 h-4 text-gray-500" aria-hidden="true" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">{currentSong.title ?? "Untitled"}</p>
                <p className="text-xs text-gray-400">{formatTime(currentSong.duration)}</p>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming tracks */}
        {upcomingCount > 0 ? (
          <div className="px-4 pb-3">
            {currentSong && <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-3">Up Next</p>}
            <ul className="space-y-0.5" aria-label="Upcoming tracks">
              {queue.slice(currentIndex + 1).map((song, i) => {
                const queueIdx = currentIndex + 1 + i;
                const isDraggingOver = dragOverIndex === i && dragIndex !== null && dragIndex !== i;
                return (
                  <li
                    key={`${song.id}-${queueIdx}`}
                    draggable
                    onDragStart={(e) => handleDragStart(e, i)}
                    onDragEnd={handleDragEnd}
                    onDragOver={(e) => handleDragOver(e, i)}
                    onDrop={(e) => handleDrop(e, i)}
                    className={`flex items-center gap-2 px-2 py-2 rounded-lg group transition-colors ${
                      isDraggingOver
                        ? "bg-violet-900/30 border border-violet-600/50"
                        : "hover:bg-gray-800 border border-transparent"
                    }`}
                  >
                    <Bars3Icon
                      className="w-4 h-4 text-gray-600 group-hover:text-gray-400 cursor-grab flex-shrink-0 transition-colors"
                      aria-hidden="true"
                    />
                    <div className="relative flex-shrink-0 w-7 h-7 rounded bg-gray-800 overflow-hidden flex items-center justify-center">
                      {song.imageUrl ? (
                        <Image src={song.imageUrl} alt={song.title ?? "Song"} fill className="object-cover" sizes="28px" />
                      ) : (
                        <MusicalNoteIcon className="w-3.5 h-3.5 text-gray-500" aria-hidden="true" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-200 truncate">{song.title ?? "Untitled"}</p>
                      <p className="text-xs text-gray-500">{formatTime(song.duration)}</p>
                    </div>
                    <button
                      onClick={() => removeFromQueue(queueIdx)}
                      aria-label={`Remove ${song.title ?? "song"} from queue`}
                      className="flex-shrink-0 w-7 h-7 flex items-center justify-center text-gray-600 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-all rounded-full hover:bg-gray-700"
                    >
                      <XMarkIcon className="w-3.5 h-3.5" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="px-4 pb-4 pt-2 text-center">
            <p className="text-sm text-gray-500 py-4">Queue is empty</p>
            <p className="text-xs text-gray-600">Use &ldquo;Add to Queue&rdquo; or &ldquo;Play Next&rdquo; from any song menu</p>
          </div>
        )}
      </div>
    </div>
  );
}
