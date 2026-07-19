"use client";

import { useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { AppShell } from "@/components/AppShell";
import { PullToRefreshContainer } from "@/components/PullToRefreshContainer";
import { RefreshCw, Sparkles, Funnel, CircleCheck, X, Rss, Clock } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { useRssFeeds } from "@/hooks/useRssFeeds";
import { useInstagramPosts } from "@/hooks/useInstagramPosts";
import { usePendingGenerations } from "@/hooks/usePendingGenerations";
import { useTodaysPicks } from "@/hooks/useTodaysPicks";
import { useInspireFilters, type SourceType, type SortMode, type UnifiedFeedItem } from "@/hooks/useInspireFilters";
import { useInspireActions } from "@/hooks/useInspireActions";

// ─── Mood badge colors ───

const MOOD_COLORS: Record<string, string> = {
  energetic: "bg-orange-500/20 text-orange-400",
  chill: "bg-blue-500/20 text-blue-400",
  melancholic: "bg-indigo-500/20 text-indigo-400",
  romantic: "bg-pink-500/20 text-pink-400",
  uplifting: "bg-yellow-500/20 text-yellow-400",
  dark: "bg-gray-500/20 text-gray-400",
  dreamy: "bg-purple-500/20 text-purple-400",
  intense: "bg-red-500/20 text-red-400",
  neutral: "bg-gray-500/20 text-gray-400",
};

// ─── Source config ───

const SOURCE_CONFIG: Record<SourceType, { label: string; color: string; icon: string }> = {
  rss: { label: "RSS", color: "text-violet-400", icon: "rss" },
  instagram: { label: "Instagram", color: "text-pink-400", icon: "camera" },
  picks: { label: "Today's Picks", color: "text-amber-400", icon: "sparkles" },
  pending: { label: "Pending", color: "text-teal-400", icon: "clock" },
};

function SourceIcon({ type, className }: { type: SourceType; className?: string }) {
  const cn = className ?? "w-3.5 h-3.5";
  switch (type) {
    case "rss":
      return <Icon icon={Rss} className={cn} />;
    case "instagram":
      return (
        <svg className={cn} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <rect x="2" y="2" width="20" height="20" rx="5" />
          <circle cx="12" cy="12" r="5" />
          <circle cx="17.5" cy="6.5" r="1.5" fill="currentColor" stroke="none" />
        </svg>
      );
    case "picks":
      return <Icon icon={Sparkles} className={cn} />;
    case "pending":
      return <Icon icon={Clock} className={cn} />;
  }
}

// ─── Unified Feed Card ───

function UnifiedCard({
  item,
  onAction,
  onApprove,
  onDismiss,
}: {
  item: UnifiedFeedItem;
  onAction: (item: UnifiedFeedItem) => void;
  onApprove?: (item: UnifiedFeedItem) => void;
  onDismiss?: (item: UnifiedFeedItem) => void;
}) {
  const sourceConfig = SOURCE_CONFIG[item.sourceType];
  const moodColor = item.mood && item.mood !== "neutral"
    ? MOOD_COLORS[item.mood] ?? MOOD_COLORS.neutral
    : null;

  return (
    <div className={`bg-surface border rounded-xl overflow-hidden ${
      item.sourceType === "pending"
        ? "border-teal-400/60 dark:border-teal-500/40 ring-1 ring-teal-400/20"
        : "border-border"
    }`}>
      {item.imageUrl && (
        <div className="aspect-video relative overflow-hidden bg-surface-raised max-h-48">
          <Image
            src={item.imageUrl}
            alt={item.title || "Post image"}
            fill
            className="object-cover"
            sizes="(max-width: 640px) 100vw, 50vw"
            unoptimized
          />
        </div>
      )}

      <div className="p-4">
        <div className="flex items-center gap-2 mb-2 text-[11px]">
          <span className={`flex items-center gap-1 font-medium ${sourceConfig.color}`}>
            <SourceIcon type={item.sourceType} className="w-3 h-3" />
            {item.sourceName || sourceConfig.label}
          </span>
          {item.date && (
            <>
              <span className="text-muted">·</span>
              <span className="text-muted">
                {item.date.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            </>
          )}
        </div>

        {item.link ? (
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-semibold text-primary leading-snug hover:text-violet-400 dark:hover:text-violet-400 transition-colors"
          >
            {item.title}
          </a>
        ) : (
          <p className="text-sm font-semibold text-primary leading-snug">
            {item.title}
          </p>
        )}

        {item.subtitle && (
          <p className="text-xs text-secondary mt-0.5">{item.subtitle}</p>
        )}

        {item.excerpt && (
          <p className="text-xs text-secondary leading-relaxed mt-2 line-clamp-3">
            {item.excerpt}
          </p>
        )}

        {item.suggestedStyle && (
          <p className="text-[11px] font-medium text-amber-400 mt-2">
            ♪ {item.suggestedStyle}
          </p>
        )}

        <div className="flex flex-wrap gap-1 mt-2">
          {moodColor && (
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${moodColor}`}>
              {item.mood}
            </span>
          )}
          {item.topics?.map((topic) => (
            <span
              key={topic}
              className="text-[10px] text-violet-400 bg-violet-500/10 px-1.5 py-0.5 rounded"
            >
              {topic}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2 mt-3">
          {item.sourceType === "pending" && onApprove && onDismiss ? (
            <>
              <button
                type="button"
                onClick={() => onApprove(item)}
                className="flex items-center gap-1.5 text-sm font-medium text-teal-400 hover:text-teal-300 transition-colors min-h-[44px]"
              >
                <Icon icon={CircleCheck} className="w-4 h-4" />
                Generate
              </button>
                <button
                type="button"
                  onClick={() => onDismiss(item)}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-400 hover:text-red-400 transition-colors min-h-[44px] ml-auto"
                  aria-label="Dismiss"
                >
                <Icon icon={X} className="w-4 h-4" />
                Dismiss
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onAction(item)}
              className="flex items-center gap-1.5 text-sm font-medium text-violet-400 hover:text-violet-300 transition-colors min-h-[44px]"
            >
              <Icon icon={Sparkles} className="w-4 h-4" />
              Generate from this
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Filter Chips ───

function SourceFilterChips({
  sources,
  activeFilters,
  onToggle,
}: {
  sources: SourceType[];
  activeFilters: Set<SourceType>;
  onToggle: (source: SourceType) => void;
}) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {sources.map((source) => {
        const config = SOURCE_CONFIG[source];
        const active = activeFilters.has(source);
        return (
          <button
            key={source}
            onClick={() => onToggle(source)}
            className={`flex items-center gap-1.5 text-[11px] font-medium px-3 py-1.5 rounded-full whitespace-nowrap transition-colors ${
              active
                ? "bg-violet-600 text-white"
                : "bg-surface-raised text-secondary hover:text-primary"
            }`}
          >
            <SourceIcon type={source} className="w-3 h-3" />
            {config.label}
          </button>
        );
      })}
    </div>
  );
}

function MoodFilterChips({
  moods,
  activeMood,
  onSelect,
}: {
  moods: string[];
  activeMood: string | null;
  onSelect: (mood: string | null) => void;
}) {
  if (moods.length === 0) return null;
  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      <Icon icon={Funnel} className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
      <button
        onClick={() => onSelect(null)}
        className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
          activeMood === null
            ? "bg-violet-600 text-white"
            : "bg-surface-raised text-secondary hover:text-primary"
        }`}
      >
        All moods
      </button>
      {moods.map((mood) => (
        <button
          key={mood}
          onClick={() => onSelect(activeMood === mood ? null : mood)}
          className={`text-[11px] font-medium px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
            activeMood === mood
              ? MOOD_COLORS[mood] ?? MOOD_COLORS.neutral
              : "bg-surface-raised text-secondary hover:text-primary"
          }`}
        >
          {mood}
        </button>
      ))}
    </div>
  );
}

// ─── Today's Picks CTA ───

function GeneratePicksCTA({
  generating,
  onGenerate,
}: {
  generating: boolean;
  onGenerate: () => void;
}) {
  return (
    <div className="bg-surface border border-dashed border-border rounded-xl p-5 text-center">
      <Icon icon={Sparkles} className="w-8 h-8 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
      <p className="text-sm text-secondary mb-3">
        Auto-curate today&apos;s top inspiration from your RSS feeds with diverse moods and sources.
      </p>
      <button
        type="button"
        onClick={onGenerate}
        disabled={generating}
        className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
      >
        {generating ? "Generating…" : "Generate Today's Picks"}
      </button>
    </div>
  );
}

// ─── Sort toggle ───

function SortToggle({ mode, onChange }: { mode: SortMode; onChange: (m: SortMode) => void }) {
  return (
    <button
      onClick={() => onChange(mode === "newest" ? "bestmatch" : "newest")}
      className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-surface-raised text-secondary hover:text-primary transition-colors whitespace-nowrap"
    >
      {mode === "newest" ? "↓ Newest" : "★ Best match"}
    </button>
  );
}

// ─── Today's Picks Section ───

function TodaysPicksSection({
  picks,
  onAction,
  onRefresh,
  refreshing,
  title,
}: {
  picks: UnifiedFeedItem[];
  onAction: (item: UnifiedFeedItem) => void;
  onRefresh: () => void;
  refreshing: boolean;
  title: string;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-amber-400 flex items-center gap-1.5">
          <Icon icon={Sparkles} className="w-4 h-4" />
          {title}
        </span>
        <button
          onClick={onRefresh}
          disabled={refreshing}
          className="flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors disabled:opacity-50"
        >
          <Icon icon={RefreshCw} className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>
      <div className="space-y-3">
        {picks.map((item) => (
          <UnifiedCard key={item.id} item={item} onAction={onAction} />
        ))}
      </div>
    </div>
  );
}

// ─── Main Content ───

function InspireContent() {
  const router = useRouter();

  const rss = useRssFeeds();
  const ig = useInstagramPosts();
  const pending = usePendingGenerations();

  const hasRss = rss.urls.length > 0;
  const hasIg = ig.urls.length > 0;
  const hasAnySources = hasRss || hasIg;

  const todaysPicks = useTodaysPicks({ hasRss });

  const filters = useInspireFilters({
    feeds: rss.feeds,
    igPosts: ig.posts,
    pendingGenerations: pending.items,
    picks: todaysPicks.picks,
  });

  const actions = useInspireActions({
    approvePending: pending.approve,
    dismissPending: pending.dismiss,
  });

  const handleRefresh = useCallback(async () => {
    const promises: Promise<void>[] = [];
    promises.push(todaysPicks.fetchPicks());
    promises.push(pending.fetchItems());
    if (hasRss) promises.push(rss.fetchFeeds(rss.urls));
    if (hasIg) promises.push(ig.fetchPosts(ig.urls));
    await Promise.all(promises);
  }, [hasRss, hasIg, rss, ig, todaysPicks, pending]);

  const isLoading = rss.loading || ig.loading || pending.loading || todaysPicks.loading || !rss.loaded;

  const lastRefreshed = useMemo(() => {
    const times = [rss.refreshed, ig.refreshed].filter(Boolean) as Date[];
    if (times.length === 0) return null;
    return new Date(Math.max(...times.map((d) => d.getTime())));
  }, [rss.refreshed, ig.refreshed]);

  const showPicksCTA =
    filters.sourceFilters.has("picks") && !todaysPicks.picks && !todaysPicks.loading && !todaysPicks.generating && hasRss;

  if (rss.loaded && !hasAnySources) {
    return (
      <div className="px-4 py-6 space-y-4">
        <h2 className="text-xl font-bold text-primary">Inspire</h2>
        <div className="bg-surface border border-border rounded-xl p-6 text-center">
          <Icon icon={Sparkles} className="w-10 h-10 text-gray-400 dark:text-gray-600 mx-auto mb-3" />
          <p className="text-secondary text-sm mb-4">
            No inspiration sources added yet. Add RSS feeds or Instagram posts in Settings to get started.
          </p>
          <button
            onClick={() => router.push("/settings")}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Go to Settings
          </button>
        </div>
      </div>
    );
  }

  return (
    <PullToRefreshContainer onRefresh={handleRefresh}>
      <div className="px-4 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-primary">Inspire</h2>
            {pending.items.length > 0 && (
              <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[11px] font-bold text-teal-100 bg-teal-500 rounded-full">
                {pending.items.length}
              </span>
            )}
          </div>
          <button
            onClick={handleRefresh}
            disabled={isLoading}
            className="flex items-center gap-1.5 text-sm text-secondary hover:text-primary transition-colors disabled:opacity-50"
          >
            <Icon icon={RefreshCw} className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {lastRefreshed && (
          <p className="text-xs text-secondary">
            Updated {lastRefreshed.toLocaleTimeString()}
          </p>
        )}

        {filters.availableSources.length > 1 && (
          <SourceFilterChips
            sources={filters.availableSources}
            activeFilters={filters.sourceFilters}
            onToggle={filters.toggleSourceFilter}
          />
        )}

        <div className="flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <MoodFilterChips moods={filters.allMoods} activeMood={filters.moodFilter} onSelect={filters.setMoodFilter} />
          </div>
          <SortToggle mode={filters.sortMode} onChange={filters.setSortMode} />
        </div>

        {showPicksCTA && (
          <GeneratePicksCTA generating={todaysPicks.generating} onGenerate={todaysPicks.generate} />
        )}

        {filters.filteredPicks.length > 0 && (
          <TodaysPicksSection
            picks={filters.filteredPicks}
            onAction={actions.handleCardAction}
            onRefresh={todaysPicks.generate}
            refreshing={todaysPicks.generating}
            title={todaysPicks.picks?.title ?? "Today's Picks"}
          />
        )}

        {filters.filteredPicks.length > 0 && filters.filteredFeed.length > 0 && (
          <div className="border-t border-border pt-2">
            <p className="text-xs font-medium text-secondary uppercase tracking-wide">
              More inspiration
            </p>
          </div>
        )}

        {isLoading && filters.filteredFeed.length === 0 && filters.filteredPicks.length === 0 && (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="bg-surface border border-border rounded-xl p-4 animate-pulse"
              >
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/4 mb-3" />
                <div className="h-4 bg-gray-200 dark:bg-gray-800 rounded w-3/4 mb-2" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-full mb-1" />
                <div className="h-3 bg-gray-200 dark:bg-gray-800 rounded w-1/2" />
              </div>
            ))}
          </div>
        )}

        <div className="space-y-3">
          {filters.filteredFeed.map((item) => (
            <UnifiedCard
              key={item.id}
              item={item}
              onAction={actions.handleCardAction}
              onApprove={item.sourceType === "pending" ? actions.handleApproveCard : undefined}
              onDismiss={item.sourceType === "pending" ? actions.handleDismissCard : undefined}
            />
          ))}
        </div>

        {!isLoading && filters.filteredFeed.length === 0 && filters.filteredPicks.length === 0 && !showPicksCTA && (
          <div className="bg-surface border border-border rounded-xl p-6 text-center">
            <p className="text-secondary text-sm">
              No items match your current filters. Try adjusting the source or mood filters.
            </p>
          </div>
        )}
      </div>
    </PullToRefreshContainer>
  );
}

export default function InspirePage() {
  return (
    <AppShell>
      <InspireContent />
    </AppShell>
  );
}
