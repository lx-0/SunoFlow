"use client";

import { useState, useRef, useEffect } from "react";
import {
  XMarkIcon,
  MusicalNoteIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { useDialogFocusTrap } from "@/hooks/useDialogFocusTrap";
import { apiGet } from "@/lib/api-client";
import { Spinner } from "../Spinner";
import type { LibrarySong } from "./types";
import { formatDuration } from "./types";

export function SongPickerModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (song: LibrarySong) => void;
}) {
  const [songs, setSongs] = useState<LibrarySong[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  useDialogFocusTrap(dialogRef, open, onClose);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    apiGet<{ songs?: LibrarySong[] }>("/api/songs?status=ready&limit=100")
      .then((data) => {
        setSongs(data.songs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const filtered = songs.filter((s) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.tags && s.tags.toLowerCase().includes(q))
    );
  });

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="song-picker-title"
        tabIndex={-1}
        className="relative w-full max-w-lg max-h-[70vh] bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h3 id="song-picker-title" className="text-sm font-semibold text-gray-900 dark:text-white">
            Pick a song from your library
          </h3>
          <button
            onClick={onClose}
            aria-label="Close song picker"
            className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <XMarkIcon className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="px-4 py-2">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              aria-label="Search songs to pick"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search songs..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner className="h-6 w-6 text-violet-500" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-gray-500 dark:text-gray-400 py-8">
              {search.trim()
                ? "No songs match your search"
                : "No completed songs in your library"}
            </p>
          ) : (
            <div className="space-y-1">
              {filtered.map((song) => (
                <button
                  key={song.id}
                  type="button"
                  onClick={() => {
                    onSelect(song);
                    onClose();
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors"
                >
                  {song.imageUrl ? (
                    <Image
                      src={song.imageUrl}
                      alt={song.title || "Song cover"}
                      width={40}
                      height={40}
                      className="rounded-lg object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center flex-shrink-0">
                      <MusicalNoteIcon className="h-5 w-5 text-gray-400" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {song.title || "Untitled"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {song.tags || "No tags"}
                      {song.duration != null &&
                        ` · ${formatDuration(song.duration)}`}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
