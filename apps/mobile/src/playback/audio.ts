import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { Song } from "@/types";

// Queue controller around expo-audio (which is a single-player engine with no
// built-in queue). Holds the play queue + current index, advances on track end,
// drives lock-screen / Control Center now-playing, and exposes a tiny external
// store so screens subscribe without coupling to expo-audio's hooks.
//
// ⚠️ UNTESTED against a device. expo-audio's exact event/field names
// (`playbackStatusUpdate`, `didJustFinish`, `setActiveForLockScreen` signature)
// are written from the docs and may need a small tweak on the first dev build.

export interface PlaybackSnapshot {
  current: Song | null;
  playing: boolean;
  positionSeconds: number;
  durationSeconds: number;
}

interface StatusUpdate {
  playing?: boolean;
  currentTime?: number;
  duration?: number;
  didJustFinish?: boolean;
}

let player: AudioPlayer | null = null;
let queue: Song[] = [];
let index = 0;
let configured = false;

let snapshot: PlaybackSnapshot = {
  current: null,
  playing: false,
  positionSeconds: 0,
  durationSeconds: 0,
};
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}
function patch(next: Partial<PlaybackSnapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

export function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}
export function getSnapshot(): PlaybackSnapshot {
  return snapshot;
}

async function ensureConfigured() {
  if (configured) return;
  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
  });
  configured = true;
}

async function loadCurrent() {
  const song = queue[index];
  if (!song) return;

  player?.remove();
  player = createAudioPlayer({ uri: song.streamUrl });

  // Lock screen + Control Center now-playing + remote transport.
  // expo-audio API: setActiveForLockScreen(active: boolean, metadata?, options?).
  player.setActiveForLockScreen(
    true,
    { title: song.title, artist: song.artist ?? "SunoFlow", artworkUrl: song.artworkUrl },
    { showSeekForward: true, showSeekBackward: true },
  );

  player.addListener("playbackStatusUpdate", (status: StatusUpdate) => {
    patch({
      playing: Boolean(status.playing),
      positionSeconds: typeof status.currentTime === "number" ? status.currentTime : snapshot.positionSeconds,
      durationSeconds: typeof status.duration === "number" ? status.duration : snapshot.durationSeconds,
    });
    if (status.didJustFinish) void skipToNext();
  });

  patch({ current: song, playing: true, positionSeconds: 0, durationSeconds: song.durationSeconds ?? 0 });
  player.play();
}

/** Replace the queue with `songs` and start playing at `startIndex`. */
export async function playQueue(songs: Song[], startIndex = 0): Promise<void> {
  await ensureConfigured();
  queue = songs;
  index = Math.max(0, Math.min(startIndex, songs.length - 1));
  await loadCurrent();
}

export function togglePlay(): void {
  if (!player) return;
  if (player.playing) {
    player.pause();
    patch({ playing: false });
  } else {
    player.play();
    patch({ playing: true });
  }
}

export async function skipToNext(): Promise<void> {
  if (index < queue.length - 1) {
    index += 1;
    await loadCurrent();
  }
}

export async function skipToPrevious(): Promise<void> {
  if (index > 0) {
    index -= 1;
    await loadCurrent();
  }
}

export function seekTo(seconds: number): void {
  player?.seekTo(seconds);
  patch({ positionSeconds: seconds });
}
