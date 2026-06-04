import * as FileSystem from "expo-file-system/legacy";
import { downsamplePeaks } from "@sunoflow/core";

// Real waveform peaks for the player. The audio file is decoded natively
// (react-native-audio-waveform's extractWaveformData → AVAudioFile, read-only,
// does NOT touch the AVAudioSession, so it never disturbs expo-audio playback).
// extractWaveformData needs a local file, so we download the stream to the cache
// once per song and reuse it.

function cacheKey(songId: string): string {
  return songId.replace(/[^a-z0-9]/gi, "_");
}

/** Download the stream to a cached local file (once) and return its file:// uri. */
export async function downloadAudioForPeaks(songId: string, streamUrl: string): Promise<string> {
  const dir = FileSystem.cacheDirectory;
  if (!dir) throw new Error("no cacheDirectory");
  const path = `${dir}wf-${cacheKey(songId)}.audio`;
  const info = await FileSystem.getInfoAsync(path);
  if (!info.exists) {
    await FileSystem.downloadAsync(streamUrl, path);
  }
  return path;
}

/**
 * Flatten the native extractor output (number[][]) and downsample to `count`
 * normalized bar heights via the SAME core algorithm the web worker uses
 * (@sunoflow/core downsamplePeaks) — identical waveforms on both platforms.
 */
export function normalizePeaks(data: number[][] | number[] | null | undefined, count: number): number[] {
  if (!data) return [];
  const flat: number[] = Array.isArray((data as number[][])[0])
    ? (data as number[][]).flat()
    : (data as number[]);
  const samples = flat.filter((n) => typeof n === "number" && Number.isFinite(n));
  if (samples.length === 0) return [];
  return downsamplePeaks(samples, count);
}
