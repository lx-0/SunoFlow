"use client";

import { useState, useRef, useCallback } from "react";
import {
  ArrowUpTrayIcon,
  MusicalNoteIcon,
} from "@heroicons/react/24/solid";
import Image from "next/image";
import { useToast } from "../Toast";
import { SongPickerModal } from "./SongPickerModal";
import type { TrackState } from "./types";
import {
  ACCEPTED_TYPES,
  MAX_FILE_SIZE,
  emptyTrack,
  formatFileSize,
  formatDuration,
} from "./types";

export function TrackSelector({
  label,
  track,
  onChange,
}: {
  label: string;
  track: TrackState;
  onChange: (t: TrackState) => void;
}) {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);

  const handleFileSelect = useCallback(
    (selectedFile: File) => {
      if (!ACCEPTED_TYPES.includes(selectedFile.type)) {
        toast(
          "Unsupported file type. Please upload an audio file (MP3, WAV, OGG, FLAC, M4A).",
          "error"
        );
        return;
      }
      if (selectedFile.size > MAX_FILE_SIZE) {
        toast("File too large (max 10MB). Try using a URL instead.", "error");
        return;
      }

      const url = URL.createObjectURL(selectedFile);
      const audio = new Audio(url);
      audio.addEventListener("loadedmetadata", () => {
        onChange({
          ...emptyTrack(),
          sourceType: "upload",
          file: selectedFile,
          previewUrl: url,
          duration: audio.duration,
        });
      });
      audio.addEventListener("error", () => {
        onChange({
          ...emptyTrack(),
          sourceType: "upload",
          file: selectedFile,
          previewUrl: url,
          duration: null,
        });
      });
    },
    [onChange, toast]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) handleFileSelect(droppedFile);
    },
    [handleFileSelect]
  );

  const clearTrack = useCallback(() => {
    if (track.previewUrl) URL.revokeObjectURL(track.previewUrl);
    onChange(emptyTrack());
  }, [track.previewUrl, onChange]);

  const hasSelection =
    track.songId || track.file || track.fileUrl.trim();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
        </label>
        {hasSelection && (
          <button
            type="button"
            onClick={clearTrack}
            className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500 dark:hover:text-red-400"
          >
            Clear
          </button>
        )}
      </div>

      <div className="flex gap-1 bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
        {(["library", "upload", "url"] as const).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => {
              if (type !== track.sourceType) {
                clearTrack();
                onChange({ ...emptyTrack(), sourceType: type });
              }
            }}
            className={`flex-1 py-1.5 px-2 rounded-md text-xs font-medium transition-colors ${
              track.sourceType === type
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            }`}
          >
            {type === "library"
              ? "Library"
              : type === "upload"
                ? "Upload"
                : "URL"}
          </button>
        ))}
      </div>

      {track.sourceType === "library" && (
        <>
          {track.songId ? (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 flex items-center gap-3">
              {track.songImageUrl ? (
                <Image
                  src={track.songImageUrl}
                  alt={track.songTitle || "Song cover"}
                  width={40}
                  height={40}
                  className="rounded-lg object-cover flex-shrink-0"
                  loading="lazy"
                />
              ) : (
                <div className="h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                  <MusicalNoteIcon className="h-5 w-5 text-violet-500" />
                </div>
              )}
              <p className="text-sm font-medium text-gray-900 dark:text-white truncate flex-1">
                {track.songTitle || "Untitled"}
              </p>
              <button
                type="button"
                onClick={() => setPickerOpen(true)}
                className="text-xs text-violet-600 dark:text-violet-400 hover:underline flex-shrink-0"
              >
                Change
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setPickerOpen(true)}
              className="w-full flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl hover:border-violet-400 dark:hover:border-violet-500 bg-gray-50 dark:bg-gray-800/50 transition-colors"
            >
              <MusicalNoteIcon className="h-6 w-6 text-gray-400 dark:text-gray-500" />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Choose from library
              </span>
            </button>
          )}
          <SongPickerModal
            open={pickerOpen}
            onClose={() => setPickerOpen(false)}
            onSelect={(song) =>
              onChange({
                ...emptyTrack(),
                sourceType: "library",
                songId: song.id,
                songTitle: song.title,
                songImageUrl: song.imageUrl,
              })
            }
          />
        </>
      )}

      {track.sourceType === "upload" && (
        <>
          {!track.file ? (
            <div
              onDrop={handleDrop}
              onDragOver={(e) => {
                e.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                setIsDragging(false);
              }}
              onClick={() => fileInputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Upload audio file"
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  fileInputRef.current?.click();
                }
              }}
              className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-xl cursor-pointer transition-colors ${
                isDragging
                  ? "border-violet-500 bg-violet-50 dark:bg-violet-900/20"
                  : "border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-500 bg-gray-50 dark:bg-gray-800/50"
              }`}
            >
              <ArrowUpTrayIcon
                className={`h-6 w-6 ${
                  isDragging
                    ? "text-violet-500"
                    : "text-gray-400 dark:text-gray-500"
                }`}
              />
              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Drop audio file or click to browse
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  MP3, WAV, OGG, FLAC, M4A (max 10MB)
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
                className="hidden"
              />
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-3 space-y-2">
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 h-10 w-10 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                  <MusicalNoteIcon className="h-5 w-5 text-violet-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {track.file.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {formatFileSize(track.file.size)}
                    {track.duration != null &&
                      ` · ${formatDuration(track.duration)}`}
                  </p>
                </div>
              </div>
              {track.previewUrl && (
                <audio
                  src={track.previewUrl}
                  controls
                  className="w-full h-8"
                  preload="metadata"
                />
              )}
            </div>
          )}
        </>
      )}

      {track.sourceType === "url" && (
        <input
          type="url"
          value={track.fileUrl}
          onChange={(e) => onChange({ ...track, fileUrl: e.target.value })}
          placeholder="https://example.com/song.mp3"
          className="w-full rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-violet-500 focus:border-transparent"
        />
      )}
    </div>
  );
}
