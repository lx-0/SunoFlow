import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { Song } from "@/types";

// Queue controller around expo-audio. ONE long-lived AudioPlayer (it owns the
// lock-screen / Control Center widget via setActiveForLockScreen +
// updateLockScreenMetadata — AudioPlaylist has no lock-screen support, so we keep
// the player). Tracks are swapped with replace(); auto-advance is driven from the
// status listener (didJustFinish OR currentTime≈duration, since didJustFinish was
// unreliable on device), guarded against double-firing.

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
let advancing = false; // guard: only fire one auto-advance per track end

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
    const pos = typeof status.currentTime === "number" ? status.currentTime : snapshot.positionSeconds;
    const dur = typeof status.duration === "number" ? status.duration : snapshot.durationSeconds;
    patch({ playing: Boolean(status.playing), positionSeconds: pos, durationSeconds: dur });

    // Auto-advance: didJustFinish is the intended signal but proved unreliable on
    // device, so also treat "stopped at (near) the end" as finished.
    const ended =
      status.didJustFinish === true ||
      (dur > 0 && pos >= dur - 0.5 && status.playing === false);
    if (ended && !advancing) {
      advancing = true;
      void skipToNext();
    }
  });

  player = p;
  return p;
}

async function loadCurrent(): Promise<void> {
  const song = queue[index];
  if (!song) return;
  const p = await ensurePlayer();
  advancing = false;

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
