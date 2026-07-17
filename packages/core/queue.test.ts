import { describe, it, expect } from "vitest";
import {
  createQueueState,
  fisherYatesShuffle,
  playQueue,
  toggleShuffle,
  skipToNext,
  skipToPrevious,
  jumpTo,
  reorderQueue,
  removeFromQueue,
  cycleRepeat,
  detectEnded,
  advanceSettled,
  clampSeek,
  ADVANCE_TIMEOUT_MS,
  type QueueState,
  type RepeatMode,
} from "./queue";

const song = (id: string) => ({ id });
const ids = (state: QueueState<{ id: string }>) => state.queue.map((s) => s.id);
/** Deterministic rng: always picks j = 0 in the Fisher-Yates loop. */
const rng0 = () => 0;

const makeState = (init: Partial<QueueState<{ id: string }>> = {}) =>
  createQueueState<{ id: string }>(init);

describe("createQueueState", () => {
  it("defaults to an empty, un-shuffled, repeat-off queue", () => {
    expect(makeState()).toEqual({
      queue: [],
      originalQueue: [],
      index: 0,
      shuffle: false,
      repeat: "off",
    });
  });
});

describe("fisherYatesShuffle", () => {
  it("returns a copy and keeps all elements", () => {
    const arr = [song("a"), song("b"), song("c")];
    const out = fisherYatesShuffle(arr, rng0);
    expect(out).not.toBe(arr);
    expect(arr.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(out.map((s) => s.id).sort()).toEqual(["a", "b", "c"]);
  });
});

describe("playQueue", () => {
  const abc = [song("a"), song("b"), song("c")];

  it.each([
    { name: "starts at the given index", startIndex: 1, index: 1, effect: "load" },
    { name: "clamps a too-large start index to the last track", startIndex: 99, index: 2, effect: "load" },
    { name: "clamps a negative start index to 0", startIndex: -5, index: 0, effect: "load" },
  ])("$name", ({ startIndex, index, effect }) => {
    const result = playQueue(makeState(), abc, startIndex);
    expect(ids(result.state)).toEqual(["a", "b", "c"]);
    expect(result.state.index).toBe(index);
    expect(result.effect).toBe(effect);
  });

  it("resets to an empty queue with effect none when given no songs", () => {
    const result = playQueue(makeState({ queue: abc, originalQueue: abc, index: 2 }), []);
    expect(result.state.queue).toEqual([]);
    expect(result.state.originalQueue).toEqual([]);
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("none");
  });

  it("shuffle keeps the chosen track first and shuffles the rest behind it", () => {
    const songs = [song("a"), song("b"), song("c"), song("d")];
    const result = playQueue(makeState({ shuffle: true }), songs, 1, rng0);
    expect(ids(result.state)).toEqual(["b", "c", "d", "a"]);
    expect(result.state.index).toBe(0);
    expect(result.state.originalQueue.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    expect(result.effect).toBe("load");
  });

  it("shuffle with no songs yields an empty queue and effect none", () => {
    const result = playQueue(makeState({ shuffle: true }), [], 0, rng0);
    expect(result.state.queue).toEqual([]);
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("none");
  });
});

describe("toggleShuffle", () => {
  const abc = [song("a"), song("b"), song("c")];

  it("on: keeps the current track first, shuffles the rest, index 0, no effect", () => {
    const result = toggleShuffle(
      makeState({ queue: abc, originalQueue: abc, index: 1 }),
      rng0,
    );
    expect(result.state.shuffle).toBe(true);
    expect(ids(result.state)).toEqual(["b", "c", "a"]);
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("none");
  });

  it("on: collapses duplicate entries of the current song to the pinned copy (documented dedupe)", () => {
    const a = song("a");
    const withDup = [a, song("b"), song("a")];
    const result = toggleShuffle(
      makeState({ queue: withDup, originalQueue: withDup, index: 0 }),
      rng0,
    );
    expect(ids(result.state)).toEqual(["a", "b"]);
    expect(result.state.queue.filter((s) => s.id === "a")).toHaveLength(1);
    expect(result.state.queue[0]).toBe(a);
    expect(result.state.index).toBe(0);
  });

  it("off: restores originalQueue and re-finds the current track by id", () => {
    const shuffled = [abc[1], abc[2], abc[0]];
    const result = toggleShuffle(
      makeState({ queue: shuffled, originalQueue: abc, index: 0, shuffle: true }),
    );
    expect(result.state.shuffle).toBe(false);
    expect(ids(result.state)).toEqual(["a", "b", "c"]);
    expect(result.state.index).toBe(1);
    expect(result.effect).toBe("none");
  });

  it("off: falls back to index 0 when the current id is not in originalQueue", () => {
    const result = toggleShuffle(
      makeState({ queue: [song("x")], originalQueue: abc, index: 0, shuffle: true }),
    );
    expect(result.state.index).toBe(0);
    expect(ids(result.state)).toEqual(["a", "b", "c"]);
  });

  it("on with an empty queue stays empty at index 0", () => {
    const result = toggleShuffle(makeState(), rng0);
    expect(result.state.queue).toEqual([]);
    expect(result.state.index).toBe(0);
    expect(result.state.shuffle).toBe(true);
  });
});

describe("skipToNext", () => {
  const abc = [song("a"), song("b"), song("c")];

  it.each<{
    name: string;
    index: number;
    repeat: RepeatMode;
    auto: boolean;
    expIndex: number;
    effect: string;
  }>([
    { name: "advances mid-queue", index: 0, repeat: "off", auto: false, expIndex: 1, effect: "load" },
    { name: "stops at the end with repeat off (auto)", index: 2, repeat: "off", auto: true, expIndex: 2, effect: "none" },
    { name: "stops at the end with repeat off (manual)", index: 2, repeat: "off", auto: false, expIndex: 2, effect: "none" },
    { name: "wraps to 0 at the end with repeat all", index: 2, repeat: "all", auto: false, expIndex: 0, effect: "load" },
    { name: "auto + repeat one replays the same track", index: 1, repeat: "one", auto: true, expIndex: 1, effect: "load" },
    { name: "manual skip with repeat one still advances", index: 1, repeat: "one", auto: false, expIndex: 2, effect: "load" },
    { name: "manual skip at the end with repeat one does nothing", index: 2, repeat: "one", auto: false, expIndex: 2, effect: "none" },
  ])("$name", ({ index, repeat, auto, expIndex, effect }) => {
    const result = skipToNext(makeState({ queue: abc, originalQueue: abc, index, repeat }), auto);
    expect(result.state.index).toBe(expIndex);
    expect(result.effect).toBe(effect);
  });

  it("does nothing on an empty queue even with repeat all", () => {
    const result = skipToNext(makeState({ repeat: "all" }));
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("none");
  });

  it("restarts a single-track queue with repeat all", () => {
    const one = [song("a")];
    const result = skipToNext(makeState({ queue: one, originalQueue: one, repeat: "all" }));
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("load");
  });
});

describe("skipToPrevious", () => {
  const abc = [song("a"), song("b"), song("c")];

  it.each<{ name: string; index: number; repeat: RepeatMode; expIndex: number; effect: string }>([
    { name: "steps back mid-queue", index: 2, repeat: "off", expIndex: 1, effect: "load" },
    { name: "does nothing at 0 with repeat off", index: 0, repeat: "off", expIndex: 0, effect: "none" },
    { name: "wraps to the last track at 0 with repeat all", index: 0, repeat: "all", expIndex: 2, effect: "load" },
  ])("$name", ({ index, repeat, expIndex, effect }) => {
    const result = skipToPrevious(makeState({ queue: abc, originalQueue: abc, index, repeat }));
    expect(result.state.index).toBe(expIndex);
    expect(result.effect).toBe(effect);
  });

  it("does nothing on an empty queue even with repeat all", () => {
    const result = skipToPrevious(makeState({ repeat: "all" }));
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("none");
  });
});

describe("jumpTo", () => {
  const abc = [song("a"), song("b"), song("c")];

  it.each([
    { name: "jumps to a valid position", target: 2, expIndex: 0, effect: "load", jumped: true },
    { name: "ignores a negative target", target: -1, expIndex: 0, effect: "none", jumped: false },
    { name: "ignores an out-of-range target", target: 3, expIndex: 0, effect: "none", jumped: false },
    { name: "ignores the current position", target: 0, expIndex: 0, effect: "none", jumped: false },
  ])("$name", ({ target, effect, jumped }) => {
    const result = jumpTo(makeState({ queue: abc, originalQueue: abc, index: 0 }), target);
    expect(result.state.index).toBe(jumped ? target : 0);
    expect(result.effect).toBe(effect);
  });
});

describe("reorderQueue", () => {
  const abcd = [song("a"), song("b"), song("c"), song("d")];

  it("re-points index at the playing track when another track moves across it", () => {
    const result = reorderQueue(makeState({ queue: abcd, originalQueue: abcd, index: 2 }), 0, 3);
    expect(ids(result.state)).toEqual(["b", "c", "d", "a"]);
    expect(result.state.index).toBe(1);
    expect(result.effect).toBe("none");
  });

  it("follows the playing track when it is the one moved", () => {
    const result = reorderQueue(makeState({ queue: abcd, originalQueue: abcd, index: 0 }), 0, 2);
    expect(ids(result.state)).toEqual(["b", "c", "a", "d"]);
    expect(result.state.index).toBe(2);
    expect(result.effect).toBe("none");
  });

  it("uses index arithmetic, not first-occurrence lookup, with duplicate entries", () => {
    const x = song("x");
    const dup = [x, song("b"), x];
    const result = reorderQueue(makeState({ queue: dup, originalQueue: dup, index: 2 }), 1, 2);
    expect(ids(result.state)).toEqual(["x", "x", "b"]);
    expect(result.state.index).toBe(1); // the playing SECOND x, not indexOf's first copy
  });

  it("follows a moved playing track to its target even when a duplicate sits earlier", () => {
    const x = song("x");
    const dup = [x, song("b"), x];
    const result = reorderQueue(makeState({ queue: dup, originalQueue: dup, index: 0 }), 0, 2);
    expect(ids(result.state)).toEqual(["b", "x", "x"]);
    expect(result.state.index).toBe(2);
  });

  it.each([
    { name: "ignores from === to", from: 1, to: 1 },
    { name: "ignores a negative from", from: -1, to: 2 },
    { name: "ignores an out-of-range to", from: 0, to: 4 },
  ])("$name", ({ from, to }) => {
    const state = makeState({ queue: abcd, originalQueue: abcd, index: 2 });
    const result = reorderQueue(state, from, to);
    expect(result.state).toBe(state);
    expect(result.effect).toBe("none");
  });

  it("syncs originalQueue to the new order when shuffle is off", () => {
    const result = reorderQueue(makeState({ queue: abcd, originalQueue: abcd, index: 0 }), 3, 0);
    expect(result.state.originalQueue.map((s) => s.id)).toEqual(["d", "a", "b", "c"]);
  });

  it("leaves originalQueue untouched when shuffle is on", () => {
    const shuffled = [abcd[2], abcd[0], abcd[3], abcd[1]];
    const result = reorderQueue(
      makeState({ queue: shuffled, originalQueue: abcd, index: 0, shuffle: true }),
      3,
      0,
    );
    expect(result.state.originalQueue).toBe(abcd);
  });

  it("does not mutate the input state", () => {
    const state = makeState({ queue: abcd, originalQueue: abcd, index: 2 });
    reorderQueue(state, 0, 3);
    expect(ids(state)).toEqual(["a", "b", "c", "d"]);
    expect(state.index).toBe(2);
  });
});

describe("removeFromQueue", () => {
  const abc = [song("a"), song("b"), song("c")];

  it("removing a track before the current one shifts index down, no effect", () => {
    const result = removeFromQueue(makeState({ queue: abc, originalQueue: abc, index: 2 }), 0);
    expect(ids(result.state)).toEqual(["b", "c"]);
    expect(result.state.index).toBe(1);
    expect(result.effect).toBe("none");
  });

  it("removing a track after the current one keeps index, no effect", () => {
    const result = removeFromQueue(makeState({ queue: abc, originalQueue: abc, index: 0 }), 2);
    expect(ids(result.state)).toEqual(["a", "b"]);
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("none");
  });

  it("removing the current track loads what shifts into its slot", () => {
    const result = removeFromQueue(makeState({ queue: abc, originalQueue: abc, index: 1 }), 1);
    expect(ids(result.state)).toEqual(["a", "c"]);
    expect(result.state.index).toBe(1); // "c" shifted into slot 1
    expect(result.effect).toBe("load");
  });

  it("removing the current track at the last position steps index back and loads", () => {
    const result = removeFromQueue(makeState({ queue: abc, originalQueue: abc, index: 2 }), 2);
    expect(ids(result.state)).toEqual(["a", "b"]);
    expect(result.state.index).toBe(1);
    expect(result.effect).toBe("load");
  });

  it("removing the last remaining track resets to empty and stops", () => {
    const one = [song("a")];
    const result = removeFromQueue(makeState({ queue: one, originalQueue: one, index: 0 }), 0);
    expect(result.state.queue).toEqual([]);
    expect(result.state.originalQueue).toEqual([]);
    expect(result.state.index).toBe(0);
    expect(result.effect).toBe("stop");
  });

  it.each([
    { name: "ignores a negative target", target: -1 },
    { name: "ignores an out-of-range target", target: 3 },
  ])("$name", ({ target }) => {
    const state = makeState({ queue: abc, originalQueue: abc, index: 1 });
    const result = removeFromQueue(state, target);
    expect(result.state).toBe(state);
    expect(result.effect).toBe("none");
  });

  it("removes the track from originalQueue too when shuffle is off", () => {
    const result = removeFromQueue(makeState({ queue: abc, originalQueue: abc, index: 0 }), 1);
    expect(result.state.originalQueue.map((s) => s.id)).toEqual(["a", "c"]);
  });

  it("leaves originalQueue untouched when shuffle is on", () => {
    const shuffled = [abc[1], abc[0], abc[2]];
    const result = removeFromQueue(
      makeState({ queue: shuffled, originalQueue: abc, index: 0, shuffle: true }),
      2,
    );
    expect(result.state.originalQueue).toBe(abc);
  });
});

describe("cycleRepeat", () => {
  it("cycles off → all → one → off", () => {
    const s0 = makeState();
    const s1 = cycleRepeat(s0);
    expect(s1.state.repeat).toBe("all");
    const s2 = cycleRepeat(s1.state);
    expect(s2.state.repeat).toBe("one");
    const s3 = cycleRepeat(s2.state);
    expect(s3.state.repeat).toBe("off");
    expect([s1.effect, s2.effect, s3.effect]).toEqual(["none", "none", "none"]);
  });
});

describe("detectEnded", () => {
  it.each([
    { name: "position reached the end", dur: 100, pos: 99.5, justStopped: false, lastPos: 99, expected: true },
    { name: "position just before the end threshold", dur: 100, pos: 98.5, justStopped: false, lastPos: 98, expected: false },
    { name: "stopped and reset to ~0 after finishing", dur: 100, pos: 0.2, justStopped: true, lastPos: 99, expected: true },
    { name: "pause within the last 2s (pos stays near dur) must NOT end", dur: 100, pos: 99, justStopped: true, lastPos: 99, expected: false },
    { name: "stopped but lastPos was nowhere near the end", dur: 100, pos: 0.2, justStopped: true, lastPos: 50, expected: false },
    { name: "reset to ~0 without a stop edge", dur: 100, pos: 0.2, justStopped: false, lastPos: 99, expected: false },
    { name: "unknown duration never ends", dur: 0, pos: 0, justStopped: true, lastPos: 0, expected: false },
  ])("$name", ({ dur, pos, justStopped, lastPos, expected }) => {
    expect(detectEnded({ dur, pos, justStopped, lastPos })).toBe(expected);
  });
});

describe("advanceSettled", () => {
  const base = { pendingSeekTarget: null, advanceStartedAt: 1000, now: 1000 };

  it.each([
    { name: "settles on a fresh position", args: { ...base, pos: 0.3 }, expected: true },
    { name: "position at the settle threshold does not settle", args: { ...base, pos: 1.5 }, expected: false },
    { name: "stale old-track position does not settle", args: { ...base, pos: 120 }, expected: false },
    { name: "settles when a pending seek landed near its target", args: { ...base, pos: 61, pendingSeekTarget: 60 }, expected: true },
    { name: "a pending seek far from its target does not settle", args: { ...base, pos: 30, pendingSeekTarget: 60 }, expected: false },
    { name: "settles after the timeout", args: { ...base, pos: 120, now: 1000 + ADVANCE_TIMEOUT_MS + 1 }, expected: true },
    { name: "exactly at the timeout does not settle", args: { ...base, pos: 120, now: 1000 + ADVANCE_TIMEOUT_MS }, expected: false },
    { name: "honors a custom settle threshold", args: { ...base, pos: 2, settleS: 3 }, expected: true },
    { name: "honors a custom timeout", args: { ...base, pos: 120, now: 1101, timeoutMs: 100 }, expected: true },
  ])("$name", ({ args, expected }) => {
    expect(advanceSettled(args)).toBe(expected);
  });
});

describe("clampSeek", () => {
  it.each([
    { name: "passes through an in-range value", seconds: 50, duration: 100, expected: 50 },
    { name: "clamps past-the-end to the duration", seconds: 200, duration: 100, expected: 100 },
    { name: "clamps negative to 0", seconds: -5, duration: 100, expected: 0 },
    { name: "NaN → 0", seconds: Number.NaN, duration: 100, expected: 0 },
    { name: "Infinity → 0", seconds: Number.POSITIVE_INFINITY, duration: 100, expected: 0 },
    { name: "unknown duration leaves a positive value unclamped", seconds: 500, duration: 0, expected: 500 },
    { name: "unknown duration still clamps negative to 0", seconds: -3, duration: 0, expected: 0 },
  ])("$name", ({ seconds, duration, expected }) => {
    expect(clampSeek(seconds, duration)).toBe(expected);
  });
});
