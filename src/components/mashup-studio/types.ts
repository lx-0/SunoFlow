export type TrackSourceType = "library" | "upload" | "url";

export interface LibrarySong {
  id: string;
  title: string | null;
  tags: string | null;
  audioUrl: string | null;
  imageUrl: string | null;
  duration: number | null;
}

export interface TrackState {
  sourceType: TrackSourceType;
  songId: string | null;
  songTitle: string | null;
  songImageUrl: string | null;
  file: File | null;
  previewUrl: string | null;
  duration: number | null;
  fileUrl: string;
}

export type { RateLimitStatus } from "@/lib/rate-limit";

export const ACCEPTED_TYPES = [
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/flac",
  "audio/mp4",
  "audio/x-m4a",
  "audio/aac",
];

export const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function emptyTrack(): TrackState {
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

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function fileToBase64(f: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(f);
  });
}

export async function buildTrackPayload(track: TrackState) {
  if (track.sourceType === "library" && track.songId) {
    return { songId: track.songId };
  }
  if (track.sourceType === "upload" && track.file) {
    const base64Data = await fileToBase64(track.file);
    return { base64Data };
  }
  if (track.sourceType === "url" && track.fileUrl.trim()) {
    return { fileUrl: track.fileUrl.trim() };
  }
  return null;
}
