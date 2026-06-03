import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { Song } from "@/types";

// Queue controller around expo-audio. ONE long-lived AudioPlayer (it owns the
// lock-screen / Control Center widget — AudioPlaylist has no lock-screen support).
// Tracks are swapped with replace(). Auto-advance is driven by POLLING the
// player's currentTime/duration/playing every 700ms: the didJustFinish event was
// unreliable on device (sometimes it never fired / the player went silent without
// a final status event), so we don't depend on it. Polling reads native state
// directly and advances when the current track reaches/stops at its end.

export interface PlaybackSnapshot {
  current: Song | null;
  playing: boolean;
  positionSeconds: number;
  durationSeconds: number;
}

let player: AudioPlayer | null = null;
let queue: Song[] = [];
let index = 0;
let advancing = false; // guard: one auto-advance per track end
let pollTimer: ReturnType<typeof setInterval> | null = null;
let lastPlaying = false;
let lastPos = 0;

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

function startPolling() {
  if (pollTimer) return;
  pollTimer = setInterval(() => {
    const p = player;
    if (!p) return;
    const dur = typeof p.duration === "number" ? p.duration : 0;
    const pos = typeof p.currentTime === "number" ? p.currentTime : 0;
    const playing = Boolean(p.playing);
    patch({ playing, positionSeconds: pos, durationSeconds: dur });

    const justStopped = lastPlaying && !playing;
    // Track ended if: position reached the end, OR playback just stopped while it
    // was near the end (covers the player resetting currentTime to 0 on finish).
    const ended = dur > 0 && (pos >= dur - 0.6 || (justStopped && lastPos >= dur - 2));
    lastPlaying = playing;
    lastPos = pos;

    if (ended && !advancing) {
      advancing = true;
      void skipToNext();
    }
  }, 700);
}

async function ensurePlayer(): Promise<AudioPlayer> {
  if (player) return player;

  await setAudioModeAsync({
    playsInSilentMode: true,
    shouldPlayInBackground: true,
    interruptionMode: "doNotMix",
  });

  const p = createAudioPlayer(null);
  p.setActiveForLockScreen(true, {}, { showSeekForward: true, showSeekBackward: true });
  player = p;
  startPolling();
  return p;
}

async function loadCurrent(): Promise<void> {
  const song = queue[index];
  if (!song) return;
  const p = await ensurePlayer();
  advancing = false;
  lastPlaying = false;
  lastPos = 0;

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
