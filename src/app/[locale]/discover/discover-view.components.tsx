import { forwardRef } from "react";
import { Globe, Sparkles, Flame, Trophy, Layers, ListMusic, Music, X, type LucideIcon } from "lucide-react";

import type { Tab } from "./discover-view.types";
import { Icon } from "@/components/ui/Icon";
import { Spinner } from "@/components/Spinner";

export const TABS: { value: Tab; label: string; icon: LucideIcon }[] = [
  { value: "for_you", label: "For You", icon: Sparkles },
  { value: "browse", label: "Browse", icon: Globe },
  { value: "trending", label: "Trending", icon: Flame },
  { value: "popular", label: "Popular", icon: Trophy },
  { value: "collections", label: "Collections", icon: Layers },
  { value: "playlists", label: "Playlists", icon: ListMusic },
];

export function FilterPill({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors min-h-[44px] ${
        active
          ? "bg-violet-100 dark:bg-violet-900/50 border-violet-400 dark:border-violet-600 text-violet-700 dark:text-violet-300"
          : "bg-surface border-border text-secondary hover:border-border-strong"
      }`}
    >
      {label}
    </button>
  );
}

export function ActiveFilterChip({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 text-xs font-medium rounded-full bg-violet-100 dark:bg-violet-900/50 border border-violet-300 dark:border-violet-600 text-violet-700 dark:text-violet-300">
      {label}
      <button
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
        className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800 transition-colors"
      >
        <Icon icon={X} className="w-3 h-3" fill="currentColor" />
      </button>
    </span>
  );
}

export function SongGridSkeleton() {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-square bg-gray-200 dark:bg-gray-800" />
          <div className="p-3 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function TrendingListSkeleton() {
  return (
    <div className="space-y-2">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-4 p-3 bg-surface border border-border rounded-xl animate-pulse"
        >
          <div className="w-8 h-6 bg-gray-200 dark:bg-gray-800 rounded shrink-0" />
          <div className="w-12 h-12 bg-gray-200 dark:bg-gray-800 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
          </div>
          <div className="w-16 h-4 bg-gray-200 dark:bg-gray-800 rounded shrink-0" />
        </div>
      ))}
    </div>
  );
}

export function EmptyState({
  hasFilters,
  onClear,
}: {
  hasFilters: boolean;
  onClear: () => void;
}) {
  return (
    <div className="text-center py-16">
      <Icon icon={Music} className="w-10 h-10 text-gray-300 dark:text-gray-700 mx-auto mb-3" fill="currentColor" />
      <p className="text-secondary text-sm">
        No songs found. Try a different filter.
      </p>
      {hasFilters && (
        <button
          onClick={onClear}
          className="mt-3 text-sm text-violet-600 dark:text-violet-400 hover:underline"
        >
          Clear all filters
        </button>
      )}
    </div>
  );
}

export const ScrollSentinel = forwardRef<HTMLDivElement, { loading: boolean }>(
  function ScrollSentinel({ loading }, ref) {
    return (
      <div
        ref={ref}
        className="flex items-center justify-center py-6"
        aria-live="polite"
      >
        {loading && (
          <span className="inline-flex items-center gap-2 text-sm text-secondary">
            <Spinner className="h-4 w-4" />
            Loading more...
          </span>
        )}
      </div>
    );
  }
);

export function PlaylistsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse"
        >
          <div className="h-24 bg-gray-200 dark:bg-gray-800" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function FetchErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/40 px-4 py-3 text-sm text-red-700 dark:text-red-400">
      <Icon icon={X} className="w-4 h-4 shrink-0" fill="currentColor" />
      <span>Failed to load: {message}</span>
    </div>
  );
}

export function CollectionsGridSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="bg-surface border border-border rounded-xl overflow-hidden animate-pulse"
        >
          <div className="aspect-video bg-gray-200 dark:bg-gray-800" />
          <div className="p-3 space-y-2">
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-3/4" />
            <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
