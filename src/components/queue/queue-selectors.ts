import type { QueueSong } from "@/components/queue/playback-state";

export function getCurrentQueueSong(
  queue: QueueSong[],
  currentIndex: number,
): QueueSong | null {
  if (currentIndex < 0 || currentIndex >= queue.length) {
    return null;
  }
  return queue[currentIndex] ?? null;
}

export function getUpcomingQueueCount(
  queueLength: number,
  currentIndex: number,
): number {
  return Math.max(0, queueLength - (currentIndex + 1));
}
