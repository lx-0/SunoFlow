export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainderSeconds.toString().padStart(2, "0")}`;
}

/**
 * Human-readable "time ago" label for a timestamp. Single source of truth for
 * every relative-time label in the web + mobile apps (previously hand-copied
 * into several components and drifted).
 *
 * Ladder: just now → Nm ago → Nh ago → yesterday → Nd ago → short date.
 * `now` is injectable so boundaries are deterministically testable.
 */
export function formatRelativeTime(dateStr: string, now: number = Date.now()): string {
  const diff = now - new Date(dateStr).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
