import { describe, expect, it } from "vitest";
import { getCurrentQueueSong, getUpcomingQueueCount } from "@/components/queue/queue-selectors";

describe("queue-selectors", () => {
  const queue = [
    { id: "a", title: "A", audioUrl: "a.mp3", imageUrl: null, duration: null },
    { id: "b", title: "B", audioUrl: "b.mp3", imageUrl: null, duration: null },
    { id: "c", title: "C", audioUrl: "c.mp3", imageUrl: null, duration: null },
  ];

  it("returns current song for a valid index", () => {
    expect(getCurrentQueueSong(queue, 1)?.id).toBe("b");
  });

  it("returns null for invalid current indexes", () => {
    expect(getCurrentQueueSong(queue, -1)).toBeNull();
    expect(getCurrentQueueSong(queue, 3)).toBeNull();
  });

  it("computes upcoming count safely", () => {
    expect(getUpcomingQueueCount(queue.length, -1)).toBe(3);
    expect(getUpcomingQueueCount(queue.length, 0)).toBe(2);
    expect(getUpcomingQueueCount(queue.length, 2)).toBe(0);
    expect(getUpcomingQueueCount(queue.length, 3)).toBe(0);
  });
});
