import type { RepeatMode } from "@/components/queue/queue-context-types";

export function getNextQueueIndex(
  currentIndex: number,
  queueLength: number,
  repeat: RepeatMode,
): number | null {
  if (queueLength <= 0 || currentIndex < 0) {
    return null;
  }

  const next = currentIndex + 1;
  if (next < queueLength) {
    return next;
  }

  if (repeat === "repeat-all") {
    return 0;
  }

  return null;
}

export function getPrevQueueIndex(
  currentIndex: number,
  queueLength: number,
  repeat: RepeatMode,
): number | null {
  if (queueLength <= 0 || currentIndex < 0) {
    return null;
  }

  const prev = currentIndex - 1;
  if (prev >= 0) {
    return prev;
  }

  if (repeat === "repeat-all") {
    return queueLength - 1;
  }

  return null;
}

export function cycleRepeatMode(repeat: RepeatMode): RepeatMode {
  if (repeat === "off") return "repeat-all";
  if (repeat === "repeat-all") return "repeat-one";
  return "off";
}
