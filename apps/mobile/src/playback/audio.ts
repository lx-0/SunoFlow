import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { Song } from "@/types";

// Queue controller around expo-audio. expo-audio is a single-player engine with
// no built-in queue, so we keep ONE long-lived player and swap tracks with
// replace() — never create a second player (that leaves the previous one playing
// → overlapping audio + dead controls). Lock-screen metadata is updated per track.

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

// Lazily create the single player on first play. Audio session + lock-screen
// binding + the status listener are set up exactly once here.
async function ensurePlayer(): Promise<AudioPlayer> {
  if (player) return player;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
  });

  const p = createAudioPlayer(null);
  p.setActiveForLockScreen(true, {}, { showSeekForward: true, showSeekBackward: true });
  p.addListener("playbackStatusUpdate", (status: StatusUpdate) => {
    patch({
      playing: Boolean(status.playing),
      positionSeconds: typeof status.currentTime === "number" ? status.currentTime : snapshot.positionSeconds,
      durationSeconds: typeof status.duration === "number" ? status.duration : snapshot.durationSeconds,
    });
    if (status.didJustFinish) void skipToNext();
  });

  player = p;
  return p;
}

// Swap the single player's source to the current queue item — no new player.
async function loadCurrent(): Promise<void> {
  const song = queue[index];
  if (!song) return;
  const p = await ensurePlayer();

  p.replace({ uri: song.streamUrl });
  p.updateLockScreenMetadata({
    title: song.title,
    artist: song.artist ?? "SunoFlow",
    artworkUrl: song.artworkUrl,
  });
  patch({ current: song, playing: true, positionSeconds: 0, durationSeconds: song.durationSeconds ?? 0 });
  p.play();
}

/** Replace the queue with `songs` and start playing at `startIndex`. */
export async function playQueue(songs: Song[], startIndex = 0): Promise<void> {
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
