// Pure, framework-agnostic playback-queue machine shared by the web (root) and
// mobile (apps/mobile) apps. Extracted from apps/mobile/src/playback/audio.ts:
// every transition replicates that module's semantics exactly, but as a pure
// reducer over immutable state — no player, no timers, no storage. The caller
// interprets the returned effect: "load" = (re)load queue[index] into the
// player, "stop" = halt playback and clear the current track, "none" =
// list-only change. The poll helpers at the bottom replicate audio.ts's
// end-detection / advance-settle / seek-clamp math for the 700ms poll loop.

export type RepeatMode = "off" | "all" | "one";

export type QueueEffect = "load" | "stop" | "none";

/** Minimal song shape the machine needs — web and mobile Song types both fit. */
export interface QueueSongLike {
  id: string;
}

export interface QueueState<TSong extends QueueSongLike> {
  /** Active (possibly shuffled) play order. */
  queue: TSong[];
  /** Canonical order, restored when shuffle turns off. */
  originalQueue: TSong[];
  index: number;
  shuffle: boolean;
  repeat: RepeatMode;
}

export interface QueueTransition<TSong extends QueueSongLike> {
  state: QueueState<TSong>;
  effect: QueueEffect;
}

export function createQueueState<TSong extends QueueSongLike>(
  init: Partial<QueueState<TSong>> = {},
): QueueState<TSong> {
  return {
    queue: [],
    originalQueue: [],
    index: 0,
    shuffle: false,
    repeat: "off",
    ...init,
  };
}

/** Fisher-Yates on a copy. `rng` is injectable for deterministic tests. */
export function fisherYatesShuffle<T>(arr: T[], rng: () => number = Math.random): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * Replace the queue with `songs` and point at `startIndex` (clamped). With
 * shuffle on, the chosen track stays first and the rest shuffles behind it.
 */
export function playQueue<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
  songs: TSong[],
  startIndex = 0,
  rng: () => number = Math.random,
): QueueTransition<TSong> {
  const originalQueue = [...songs];
  const start = Math.max(0, Math.min(startIndex, songs.length - 1));
  let queue: TSong[];
  let index: number;
  if (state.shuffle) {
    // Keep the chosen track first, shuffle the rest behind it.
    const startSong = songs[start];
    const rest = fisherYatesShuffle(
      songs.filter((_, i) => i !== start),
      rng,
    );
    queue = startSong ? [startSong, ...rest] : rest;
    index = 0;
  } else {
    queue = [...songs];
    index = start;
  }
  const next = { ...state, queue, originalQueue, index };
  return { state: next, effect: queue[index] ? "load" : "none" };
}

/**
 * Toggle shuffle. Keeps the current track playing; reorders what comes next.
 *
 * NOTE: shuffle-on filters the rest by the current song's ID (the mobile
 * controller's semantic) — duplicate entries of the current song collapse to
 * the pinned copy while shuffled. The web wrapper deliberately does NOT use
 * this path for shuffle-on (it preserves duplicates via index-filter); see
 * src/components/queue/queue-ops.ts.
 */
export function toggleShuffle<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
  rng: () => number = Math.random,
): QueueTransition<TSong> {
  const shuffle = !state.shuffle;
  const currentSong = state.queue[state.index];
  let queue: TSong[];
  let index: number;
  if (shuffle) {
    const rest = fisherYatesShuffle(
      state.originalQueue.filter((s) => s.id !== currentSong?.id),
      rng,
    );
    queue = currentSong ? [currentSong, ...rest] : rest;
    index = 0;
  } else {
    queue = [...state.originalQueue];
    index = Math.max(
      0,
      queue.findIndex((s) => s.id === currentSong?.id),
    );
  }
  return { state: { ...state, queue, index, shuffle }, effect: "none" };
}

/**
 * Advance to the next track. `auto` = triggered by a track ending (vs. the user
 * tapping next), which is what makes repeat-one repeat instead of skip.
 */
export function skipToNext<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
  auto = false,
): QueueTransition<TSong> {
  if (auto && state.repeat === "one") {
    return { state, effect: "load" }; // replay the same track
  }
  if (state.index < state.queue.length - 1) {
    return { state: { ...state, index: state.index + 1 }, effect: "load" };
  }
  // At the last track: wrap around if repeating the whole queue, else stop.
  if (state.repeat === "all" && state.queue.length > 0) {
    return { state: { ...state, index: 0 }, effect: "load" };
  }
  return { state, effect: "none" };
}

export function skipToPrevious<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
): QueueTransition<TSong> {
  if (state.index > 0) {
    return { state: { ...state, index: state.index - 1 }, effect: "load" };
  }
  if (state.repeat === "all" && state.queue.length > 0) {
    return { state: { ...state, index: state.queue.length - 1 }, effect: "load" };
  }
  return { state, effect: "none" };
}

/** Jump to an explicit queue position (Up-Next list tap). */
export function jumpTo<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
  target: number,
): QueueTransition<TSong> {
  if (target < 0 || target >= state.queue.length || target === state.index) {
    return { state, effect: "none" };
  }
  return { state: { ...state, index: target }, effect: "load" };
}

/**
 * Move a queued track from one position to another (Up-Next reorder). Pure list
 * change — never an effect, so the current track keeps playing uninterrupted;
 * `index` is re-pointed at wherever the playing track lands.
 */
export function reorderQueue<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
  from: number,
  to: number,
): QueueTransition<TSong> {
  if (from === to) return { state, effect: "none" };
  if (from < 0 || from >= state.queue.length || to < 0 || to >= state.queue.length) {
    return { state, effect: "none" };
  }
  const queue = [...state.queue];
  const [moved] = queue.splice(from, 1);
  queue.splice(to, 0, moved);
  const originalQueue = state.shuffle ? state.originalQueue : [...queue];
  // Re-point by index arithmetic, not indexOf: duplicate entries of the same
  // song would resolve to the FIRST occurrence and jump the playing marker.
  let index = state.index;
  if (from === state.index) index = to;
  else if (from < state.index && to >= state.index) index = state.index - 1;
  else if (from > state.index && to <= state.index) index = state.index + 1;
  return { state: { ...state, queue, originalQueue, index }, effect: "none" };
}

/**
 * Remove a track from the queue. Removing the currently-playing track loads
 * whatever shifts into its slot (or stops if the queue empties); removing a
 * track before the current one keeps `index` pointed at the same playing track.
 */
export function removeFromQueue<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
  target: number,
): QueueTransition<TSong> {
  if (target < 0 || target >= state.queue.length) return { state, effect: "none" };
  const removingCurrent = target === state.index;
  const removed = state.queue[target];
  const queue = [...state.queue];
  queue.splice(target, 1);
  const originalQueue =
    !state.shuffle && removed
      ? state.originalQueue.filter((s) => s !== removed)
      : state.originalQueue;

  if (queue.length === 0) {
    return { state: { ...state, queue, originalQueue, index: 0 }, effect: "stop" };
  }
  if (removingCurrent) {
    const index = state.index >= queue.length ? queue.length - 1 : state.index;
    // Play whatever shifted into this slot.
    return { state: { ...state, queue, originalQueue, index }, effect: "load" };
  }
  const index = target < state.index ? state.index - 1 : state.index;
  return { state: { ...state, queue, originalQueue, index }, effect: "none" };
}

/** Cycle repeat mode: off → all → one → off. */
export function cycleRepeat<TSong extends QueueSongLike>(
  state: QueueState<TSong>,
): QueueTransition<TSong> {
  const repeat: RepeatMode =
    state.repeat === "off" ? "all" : state.repeat === "all" ? "one" : "off";
  return { state: { ...state, repeat }, effect: "none" };
}

// --- Poll helpers (extracted from the audio.ts 700ms poll loop) ---

/** A fresh position below this settles an in-flight track load. */
export const ADVANCE_SETTLE_S = 1.5;
/** A load pending longer than this settles regardless (failed-load escape). */
export const ADVANCE_TIMEOUT_MS = 15000;

/**
 * Track-end detection for a poll tick. Ended if: position reached the end, OR
 * playback just stopped AND the player reset currentTime to ~0 after finishing
 * (lastPos near the end, pos now ~0). The `pos < 1` clause is critical: a user
 * pause within the last 2s leaves pos near `dur` (not 0), so it must NOT be
 * treated as a track end — otherwise pausing near the end auto-skips.
 */
export function detectEnded(args: {
  dur: number;
  pos: number;
  justStopped: boolean;
  lastPos: number;
}): boolean {
  const { dur, pos, justStopped, lastPos } = args;
  return dur > 0 && (pos >= dur - 0.6 || (justStopped && lastPos >= dur - 2 && pos < 1));
}

/**
 * Whether an in-flight track load has settled: the new track reports a fresh
 * position, a pending seek landed (within 2s of its target), or the timeout
 * elapsed (a failed load must not suppress auto-advance forever).
 */
export function advanceSettled(args: {
  pos: number;
  pendingSeekTarget: number | null;
  advanceStartedAt: number;
  now: number;
  settleS?: number;
  timeoutMs?: number;
}): boolean {
  const {
    pos,
    pendingSeekTarget,
    advanceStartedAt,
    now,
    settleS = ADVANCE_SETTLE_S,
    timeoutMs = ADVANCE_TIMEOUT_MS,
  } = args;
  const seekSettled = pendingSeekTarget != null && Math.abs(pos - pendingSeekTarget) < 2;
  return pos < settleS || seekSettled || now - advanceStartedAt > timeoutMs;
}

/**
 * Clamp a seek target: NaN/±Infinity → 0, negative → 0, past a known duration →
 * duration. An unknown duration (0) leaves a positive value unclamped.
 */
export function clampSeek(seconds: number, duration: number): number {
  return Number.isFinite(seconds)
    ? Math.max(0, duration > 0 ? Math.min(seconds, duration) : seconds)
    : 0;
}
