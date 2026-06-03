import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from "expo-audio";
import type { Song } from "@/types";
import { recordPlay } from "@/api/history";
import { enableRemoteControls, onRemoteNext, onRemotePrevious } from "../../modules/remote-controls";

export type RepeatMode = "off" | "all" | "one";

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
  index: number;
  queueLength: number;
  queue: Song[];
  shuffle: boolean;
  repeat: RepeatMode;
}

let player: AudioPlayer | null = null;
let queue: Song[] = []; // active (possibly shuffled) order
let originalQueue: Song[] = []; // canonical order, to restore when shuffle is off
let shuffle = false;
let repeat: RepeatMode = "off";
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
  index: 0,
  queueLength: 0,
  queue: [],
  shuffle: false,
  repeat: "off",
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
    // Re-assert next/prev (+ seek off) every tick: expo-audio keeps reconfiguring
    // MPRemoteCommandCenter (showing ±seek), so a one-shot enable() loses to it.
    enableRemoteControls();
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
      void skipToNext(true); // auto-advance: honors repeat mode
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
  // showSeek* off → iOS shows next/prev track buttons instead of ±seconds, which
  // our native RemoteControls module enables + forwards to the queue below.
  p.setActiveForLockScreen(true, {}, { showSeekForward: false, showSeekBackward: false });
  player = p;

  // Native lock-screen next/prev → our queue (expo-audio has no next/prev).
  enableRemoteControls();
  onRemoteNext(() => void skipToNext());
  onRemotePrevious(() => void skipToPrevious());

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
  // Re-assert next/prev: expo-audio reconfigures the command center per track and
  // may disable them, so enable again after updateLockScreenMetadata.
  enableRemoteControls();
  patch({ current: song, playing: true, positionSeconds: 0, durationSeconds: song.durationSeconds ?? 0, index, queueLength: queue.length, queue });
  p.play();

  // Record the play (server-side history + active-user metric). Fire-and-forget:
  // dedupe + ownership are handled by the backend; a failure never breaks playback.
  void recordPlay(song.id).catch(() => {});
}

/** Fisher-Yates in place. Math.random is fine in the app runtime. */
function shuffleInPlace<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

/** Replace the queue with `songs` and start playing at `startIndex`. */
export async function playQueue(songs: Song[], startIndex = 0): Promise<void> {
  originalQueue = [...songs];
  const start = Math.max(0, Math.min(startIndex, songs.length - 1));
  if (shuffle) {
    // Keep the chosen track first, shuffle the rest behind it.
    const startSong = songs[start];
    const rest = songs.filter((_, i) => i !== start);
    shuffleInPlace(rest);
    queue = startSong ? [startSong, ...rest] : rest;
    index = 0;
  } else {
    queue = [...songs];
    index = start;
  }
  await loadCurrent();
}

/** Toggle shuffle. Keeps the current track playing; reorders what comes next. */
export function toggleShuffle(): void {
  shuffle = !shuffle;
  const currentSong = queue[index];
  if (shuffle) {
    const rest = originalQueue.filter((s) => s.id !== currentSong?.id);
    shuffleInPlace(rest);
    queue = currentSong ? [currentSong, ...rest] : rest;
    index = 0;
  } else {
    queue = [...originalQueue];
    index = Math.max(0, queue.findIndex((s) => s.id === currentSong?.id));
  }
  patch({ index, queueLength: queue.length, queue, shuffle });
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

/**
 * Advance to the next track. `auto` = triggered by a track ending (vs. the user
 * tapping next), which is what makes repeat-one repeat instead of skip.
 */
export async function skipToNext(auto = false): Promise<void> {
  if (auto && repeat === "one") {
    await loadCurrent(); // replay the same track
    return;
  }
  if (index < queue.length - 1) {
    index += 1;
    await loadCurrent();
    return;
  }
  // At the last track: wrap around if repeating the whole queue, else stop.
  if (repeat === "all" && queue.length > 0) {
    index = 0;
    await loadCurrent();
  }
}

export async function skipToPrevious(): Promise<void> {
  if (index > 0) {
    index -= 1;
    await loadCurrent();
  } else if (repeat === "all" && queue.length > 0) {
    index = queue.length - 1;
    await loadCurrent();
  }
}

/** Jump to an explicit queue position (Up-Next list tap). */
export async function jumpTo(target: number): Promise<void> {
  if (target < 0 || target >= queue.length || target === index) return;
  index = target;
  await loadCurrent();
}

/** Cycle repeat mode: off → all → one → off. */
export function toggleRepeat(): void {
  repeat = repeat === "off" ? "all" : repeat === "all" ? "one" : "off";
  patch({ repeat });
}

export function seekTo(seconds: number): void {
  player?.seekTo(seconds);
  patch({ positionSeconds: seconds });
}
