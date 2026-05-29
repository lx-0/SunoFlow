"use client";

import { useState, useRef, useCallback } from "react";
import { useToast } from "../Toast";

const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

type TrackSourceType = "library" | "upload" | "url";

interface TrackState {
  sourceType: TrackSourceType;
  songId: string | null;
  songTitle: string | null;
  songImageUrl: string | null;
  file: File | null;
  previewUrl: string | null;
  duration: number | null;
  fileUrl: string;
}

function emptyTrack(): TrackState {
  return {
    sourceType: "library",
    songId: null,
    songTitle: null,
    songImageUrl: null,
    file: null,
    previewUrl: null,
    duration: null,
    fileUrl: "",
  };
}

export { emptyTrack };
export type { TrackState, TrackSourceType };

export function useTrackFileHandler(
  track: TrackState,
  onChange: (t: TrackState) => void
) {
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

  const hasSelection = !!(track.songId || track.file || track.fileUrl.trim());

  return {
    fileInputRef,
    isDragging,
    setIsDragging,
    pickerOpen,
    setPickerOpen,
    handleFileSelect,
    handleDrop,
    clearTrack,
    hasSelection,
  };
}
