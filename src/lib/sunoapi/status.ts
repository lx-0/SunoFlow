import type {
  TaskStatus,
  TaskStatusResult,
  SunoSong,
  LyricsDetailResult,
  VocalSeparationDetailResult,
  WavConversionDetailResult,
  MusicVideoDetailResult,
  MidiDetailResult,
  CoverImageDetailResult,
} from "./types";
import { SunoApiError, BASE_URL, fetchWithRetry, buildHeaders, mapRawSong, taskStatusToSongStatus } from "./http";

/**
 * Poll for the status and results of a generation task.
 */
export async function getTaskStatus(
  taskId: string,
  apiKey?: string
): Promise<TaskStatusResult> {
  const res = await fetchWithRetry(
    `${BASE_URL}/generate/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET", headers: buildHeaders(apiKey) }
  );

  const json = (await res.json()) as {
    code?: number;
    msg?: string;
    data?: {
      taskId?: string;
      status?: TaskStatus;
      errorMessage?: string | null;
      operationType?: string;
      response?: {
        sunoData?: Record<string, unknown>[];
      };
    };
  };

  const data = json.data;
  if (!data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in task status response");
  }

  const status = data.status ?? "PENDING";
  const rawSongs = data.response?.sunoData ?? [];
  const songs: SunoSong[] = rawSongs.map((raw) => {
    const song = mapRawSong(raw);
    song.status = taskStatusToSongStatus(status);
    return song;
  });

  return {
    taskId: data.taskId ?? taskId,
    status,
    songs,
    errorMessage: data.errorMessage,
    operationType: data.operationType,
  };
}

/**
 * Get remaining credits for the account.
 */
export async function getRemainingCredits(apiKey?: string): Promise<number> {
  const res = await fetchWithRetry(`${BASE_URL}/generate/credit`, {
    method: "GET",
    headers: buildHeaders(apiKey),
  });

  const json = (await res.json()) as { code?: number; msg?: string; data?: number };

  if (json.data == null) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No credit data returned");
  }

  return json.data;
}

/**
 * Get lyrics generation task details.
 */
export async function getLyricsDetail(
  taskId: string,
  apiKey?: string
): Promise<LyricsDetailResult> {
  const res = await fetchWithRetry(
    `${BASE_URL}/lyrics/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET", headers: buildHeaders(apiKey) }
  );

  const json = (await res.json()) as { code?: number; msg?: string; data?: LyricsDetailResult };
  if (!json.data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in lyrics detail response");
  }
  return json.data;
}

/**
 * Get vocal separation task details including stem URLs.
 */
export async function getVocalSeparationDetail(
  taskId: string,
  apiKey?: string
): Promise<VocalSeparationDetailResult> {
  const res = await fetchWithRetry(
    `${BASE_URL}/vocal-removal/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET", headers: buildHeaders(apiKey) }
  );

  const json = (await res.json()) as { code?: number; msg?: string; data?: VocalSeparationDetailResult };
  if (!json.data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in vocal separation detail response");
  }
  return json.data;
}

/**
 * Get WAV conversion task details.
 */
export async function getWavConversionDetail(
  taskId: string,
  apiKey?: string
): Promise<WavConversionDetailResult> {
  const res = await fetchWithRetry(
    `${BASE_URL}/wav/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET", headers: buildHeaders(apiKey) }
  );

  const json = (await res.json()) as { code?: number; msg?: string; data?: WavConversionDetailResult };
  if (!json.data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in WAV conversion detail response");
  }
  return json.data;
}

/**
 * Get music video generation task details.
 */
export async function getMusicVideoDetail(
  taskId: string,
  apiKey?: string
): Promise<MusicVideoDetailResult> {
  const res = await fetchWithRetry(
    `${BASE_URL}/mp4/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET", headers: buildHeaders(apiKey) }
  );

  const json = (await res.json()) as { code?: number; msg?: string; data?: MusicVideoDetailResult };
  if (!json.data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in music video detail response");
  }
  return json.data;
}

/**
 * Get MIDI generation task details including instrument/note data.
 */
export async function getMidiDetail(
  taskId: string,
  apiKey?: string
): Promise<MidiDetailResult> {
  const res = await fetchWithRetry(
    `${BASE_URL}/midi/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET", headers: buildHeaders(apiKey) }
  );

  const json = (await res.json()) as { code?: number; msg?: string; data?: MidiDetailResult };
  if (!json.data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in MIDI detail response");
  }
  return json.data;
}

/**
 * Get cover image generation task details.
 */
export async function getCoverImageDetail(
  taskId: string,
  apiKey?: string
): Promise<CoverImageDetailResult> {
  const res = await fetchWithRetry(
    `${BASE_URL}/suno/cover/record-info?taskId=${encodeURIComponent(taskId)}`,
    { method: "GET", headers: buildHeaders(apiKey) }
  );

  const json = (await res.json()) as { code?: number; msg?: string; data?: CoverImageDetailResult };
  if (!json.data) {
    throw new SunoApiError(json.code ?? 500, json.msg ?? "No data in cover image detail response");
  }
  return json.data;
}
