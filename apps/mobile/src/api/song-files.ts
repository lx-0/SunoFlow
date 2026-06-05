import * as FileSystem from "expo-file-system/legacy";
import { Share } from "react-native";
import { API_BASE_URL, apiGet, apiPost } from "./client";
import { getApiKey } from "@/auth/session";

// Song download + export. Mirrors the web song-detail Export panel:
//   - downloadSong: streams the audio file (GET /api/songs/:id/download) to the
//     device cache, then opens the share sheet so the user can save/send it.
//   - exportWav / exportMidi / exportMusicVideo: fire the async server-side
//     conversions (POST). They return immediately; the conversion runs on the
//     backend. The orchestrator surfaces a "started, check back" message.
//
// Auth: every call uses the Bearer API key (sk-…) from the keychain, matching
// the rest of src/api. The download route is authRoute (Bearer), not cookies.

export type DownloadFormat = "native" | "mp3" | "wav" | "flac";

/** Server response shape for the three async transform routes. */
export interface TransformStarted {
  taskId: string;
  /** "pending" while the backend converts; "ready" in mock mode. */
  status: "pending" | "ready";
  songId: string;
  format: string;
}

const EXT_BY_FORMAT: Record<DownloadFormat, string> = {
  native: "mp3",
  mp3: "mp3",
  wav: "wav",
  flac: "flac",
};

/** Turn an arbitrary song title into a safe, non-empty filename stem. */
function safeFilename(title: string): string {
  const cleaned = title
    .trim()
    .replace(/[^a-zA-Z0-9-_ ]+/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 80);
  return cleaned.length > 0 ? cleaned : "song";
}

/**
 * Download a song's audio to the device cache and open the share sheet.
 *
 * @throws if no API key is stored, the cache directory is unavailable, or the
 *   server responds with a non-200 status.
 */
export async function downloadSong(
  songId: string,
  title: string,
  format: DownloadFormat = "mp3",
): Promise<void> {
  const key = await getApiKey();
  if (!key) {
    throw new Error("Not signed in.");
  }

  const cacheDir = FileSystem.cacheDirectory;
  if (!cacheDir) {
    throw new Error("No writable cache directory on this device.");
  }

  const ext = EXT_BY_FORMAT[format];
  const url =
    `${API_BASE_URL}/api/songs/${encodeURIComponent(songId)}/download` +
    `?format=${format}&metadata=true`;
  const fileUri = `${cacheDir}${safeFilename(title)}.${ext}`;

  const result = await FileSystem.downloadAsync(url, fileUri, {
    headers: { Authorization: `Bearer ${key}` },
  });

  if (result.status !== 200) {
    throw new Error(`Download failed (HTTP ${result.status}).`);
  }

  await Share.share({ url: result.uri });
}

/** Trigger an async WAV conversion on the backend. Returns once started. */
export function exportWav(songId: string): Promise<TransformStarted> {
  return apiPost<TransformStarted>(
    `/api/songs/${encodeURIComponent(songId)}/convert-wav`,
    {},
  );
}

/** Trigger async MIDI extraction on the backend. Returns once started. */
export function exportMidi(songId: string): Promise<TransformStarted> {
  return apiPost<TransformStarted>(
    `/api/songs/${encodeURIComponent(songId)}/generate-midi`,
    {},
  );
}

/** Trigger async music-video generation on the backend. Returns once started. */
export function exportMusicVideo(songId: string): Promise<TransformStarted> {
  return apiPost<TransformStarted>(
    `/api/songs/${encodeURIComponent(songId)}/music-video`,
    {},
  );
}

export interface VideoStatus {
  /** Suno status: SUCCESS | *_FAILED | CALLBACK_EXCEPTION | (pending) */
  status: string;
  videoUrl: string | null;
  error: string | null;
}

/** Poll a music-video generation task. GET /music-video/status?taskId=. */
export async function fetchMusicVideoStatus(songId: string, taskId: string): Promise<VideoStatus> {
  const r = await apiGet<{ status?: string; videoUrl?: string; errorMessage?: string; error?: string }>(
    `/api/songs/${encodeURIComponent(songId)}/music-video/status?taskId=${encodeURIComponent(taskId)}`,
  );
  return {
    status: typeof r?.status === "string" ? r.status : "",
    videoUrl: typeof r?.videoUrl === "string" ? r.videoUrl : null,
    error: (typeof r?.errorMessage === "string" ? r.errorMessage : null) ?? (typeof r?.error === "string" ? r.error : null),
  };
}
