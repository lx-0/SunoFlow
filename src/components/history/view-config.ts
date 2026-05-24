import type { HistorySortKey } from "./filter-url-state";

export type HistoryStatusFilter = "all" | "ready" | "pending" | "failed";

export const HISTORY_STATUS_FILTERS: { label: string; value: HistoryStatusFilter }[] = [
  { label: "All", value: "all" },
  { label: "Ready", value: "ready" },
  { label: "Pending", value: "pending" },
  { label: "Failed", value: "failed" },
];

export const HISTORY_SORT_OPTIONS: { label: string; value: HistorySortKey }[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
];

export function formatHistoryRelativeDate(date: Date | string): string {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  const diffHr = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
