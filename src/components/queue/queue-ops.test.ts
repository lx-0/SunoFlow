import { describe, expect, it } from "vitest";
import {
  buildPlayQueue,
  insertAfterCurrent,
  removeFromQueueState,
  reorderQueueState,
  toggleShuffleQueue,
} from "@/components/queue/queue-ops";

const makeSong = (id: string) => ({
  id,
  title: id,
  audioUrl: `https://example.com/${id}.mp3`,
  imageUrl: `https://example.com/${id}.jpg`,
  duration: 120,
});

describe("queue-ops", () => {
  it("buildPlayQueue clamps invalid start index", () => {
    const songs = [makeSong("a"), makeSong("b"), makeSong("c")];
    const { playOrder, playIndex } = buildPlayQueue(songs, 99, false);

    expect(playIndex).toBe(2);
    expect(playOrder.map((s) => s.id)).toEqual(["a", "b", "c"]);
  });

  it("buildPlayQueue keeps start song at index 0 in shuffle mode", () => {
    const songs = [makeSong("a"), makeSong("b"), makeSong("c")];
    const { playOrder, playIndex } = buildPlayQueue(songs, 1, true);

    expect(playIndex).toBe(0);
    expect(playOrder[0].id).toBe("b");
    expect(playOrder.map((s) => s.id).sort()).toEqual(["a", "b", "c"]);
  });

  it("toggleShuffleQueue restores original queue when turning shuffle off", () => {
    const original = [makeSong("a"), makeSong("b"), makeSong("c")];
    const shuffled = [original[1], original[2], original[0]];

    const result = toggleShuffleQueue(shuffled, 0, false, original);

    expect(result.queue.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(result.currentIndex).toBe(1);
  });

  it("toggleShuffleQueue preserves duplicate queue entries when turning shuffle on", () => {
    const a = makeSong("a");
    const queue = [a, makeSong("b"), a];

    const result = toggleShuffleQueue(queue, 0, true, queue);

    expect(result.queue).toHaveLength(3);
    expect(result.queue[0]).toBe(a);
    expect(result.currentIndex).toBe(0);
    expect(result.queue.map((s) => s.id).sort()).toEqual(["a", "a", "b"]);
  });

  it("insertAfterCurrent places song after current index", () => {
    const queue = [makeSong("a"), makeSong("b")];
    const result = insertAfterCurrent(queue, 0, makeSong("x"));

    expect(result.map((s) => s.id)).toEqual(["a", "x", "b"]);
  });

  it("removeFromQueueState marks removedCurrent when current song is removed", () => {
    const queue = [makeSong("a"), makeSong("b"), makeSong("c")];
    const result = removeFromQueueState(queue, 1, 1);

    expect(result.queue.map((s) => s.id)).toEqual(["a", "c"]);
    expect(result.currentIndex).toBe(-1);
    expect(result.removedCurrent).toBe(true);
  });

  it("removeFromQueueState ignores out-of-range index", () => {
    const queue = [makeSong("a"), makeSong("b"), makeSong("c")];
    const result = removeFromQueueState(queue, 1, 20);

    expect(result.queue.map((s) => s.id)).toEqual(["a", "b", "c"]);
    expect(result.currentIndex).toBe(1);
    expect(result.removedCurrent).toBe(false);
  });

  it("reorderQueueState tracks current index movement", () => {
    const queue = [makeSong("a"), makeSong("b"), makeSong("c"), makeSong("d")];
    const result = reorderQueueState(queue, 2, 0, 3);

    expect(result.queue.map((s) => s.id)).toEqual(["b", "c", "d", "a"]);
    expect(result.currentIndex).toBe(1);
  });

  it("reorderQueueState keeps pointing at the playing duplicate via index arithmetic", () => {
    const x = makeSong("x");
    const queue = [x, makeSong("b"), x];

    const result = reorderQueueState(queue, 2, 1, 2);

    expect(result.queue.map((s) => s.id)).toEqual(["x", "x", "b"]);
    expect(result.currentIndex).toBe(1);
  });

  it("reorderQueueState ignores out-of-range indices", () => {
    const queue = [makeSong("a"), makeSong("b"), makeSong("c"), makeSong("d")];
    const result = reorderQueueState(queue, 2, -1, 3);

    expect(result.queue.map((s) => s.id)).toEqual(["a", "b", "c", "d"]);
    expect(result.currentIndex).toBe(2);
  });
});
