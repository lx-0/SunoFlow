export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || Number.isNaN(seconds) || !Number.isFinite(seconds)) {
    return "--:--";
  }

  const minutes = Math.floor(seconds / 60);
  const remainderSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainderSeconds.toString().padStart(2, "0")}`;
}
