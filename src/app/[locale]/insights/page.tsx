"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api-client";
import { Icon } from "@/components/ui/Icon";
import {
  Music,
  Heart,
  CircleCheck,
  Clock,
  Sparkles,
  ChartColumn,
  Lightbulb,
  type LucideIcon,
} from "lucide-react";

const GenreBarChart = dynamic(
  () =>
    import("@/components/analytics/InsightsCharts").then(
      (mod) => mod.GenreBarChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] animate-pulse bg-surface-raised rounded" />
    ),
  }
);

const WeeklyActivityChart = dynamic(
  () =>
    import("@/components/analytics/InsightsCharts").then(
      (mod) => mod.WeeklyActivityChart
    ),
  {
    ssr: false,
    loading: () => (
      <div className="h-[200px] animate-pulse bg-surface-raised rounded" />
    ),
  }
);

interface GenerationInsightsData {
  totalSongs: number;
  completedSongs: number;
  failedSongs: number;
  successRate: number | null;
  totalFavorites: number;
  totalPlayTimeSec: number;
  genreBreakdown: Array<{ genre: string; count: number }>;
  weeklyActivity: Array<{ week: string; count: number }>;
  bestPrompts: Array<{ prompt: string; favCount: number; plays: number; uses: number }>;
}

function formatPlayTime(totalSec: number): string {
  if (totalSec < 60) return `${totalSec}s`;
  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  if (hours === 0) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function StatCard({
  label,
  value,
  sub,
  icon: ItemIcon,
  iconColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
  iconColor: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-secondary">
          {label}
        </span>
        <Icon icon={ItemIcon} className={`w-4 h-4 ${iconColor}`} />
      </div>
      <div className="text-2xl font-bold text-primary">{value}</div>
      {sub && (
        <p className="text-xs text-muted mt-0.5">{sub}</p>
      )}
    </div>
  );
}

export default function InsightsPage() {
  const [data, setData] = useState<GenerationInsightsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setData(await apiGet<GenerationInsightsData>("/api/analytics/generation-insights"));
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <AppShell>
        <div className="px-4 py-6">
          <h1 className="text-xl font-bold text-primary mb-6">
            Generation Insights
          </h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (error || !data) {
    return (
      <AppShell>
        <div className="px-4 py-6">
          <h1 className="text-xl font-bold text-primary mb-6">
            Generation Insights
          </h1>
          <p className="text-red-400">Failed to load insights. Please try again.</p>
        </div>
      </AppShell>
    );
  }

  const isEmpty = data.totalSongs === 0;

  return (
    <AppShell>
      <div className="px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-primary">
          Generation Insights
        </h1>

        {isEmpty ? (
          <div className="bg-surface border border-border rounded-xl p-8 text-center">
            <Icon icon={ChartColumn} className="w-12 h-12 mx-auto text-muted mb-3" />
            <p className="text-secondary font-medium">No generations yet</p>
            <p className="text-sm text-muted mt-1">
              Start generating songs to see your insights here.
            </p>
          </div>
        ) : (
          <>
            {/* Overview stats */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                label="Songs Generated"
                value={data.totalSongs}
                icon={Music}
                iconColor="text-violet-400"
              />
              <StatCard
                label="Success Rate"
                value={data.successRate !== null ? `${data.successRate}%` : "—"}
                sub={`${data.completedSongs} completed · ${data.failedSongs} failed`}
                icon={CircleCheck}
                iconColor="text-green-500"
              />
              <StatCard
                label="Total Favorites"
                value={data.totalFavorites}
                icon={Heart}
                iconColor="text-pink-500"
              />
              <StatCard
                label="Total Play Time"
                value={formatPlayTime(data.totalPlayTimeSec)}
                sub={`${data.completedSongs} completed songs`}
                icon={Clock}
                iconColor="text-blue-400"
              />
            </div>

            {/* Success rate bar */}
            {data.successRate !== null && data.totalSongs > 0 && (
              <div className="bg-surface border border-border rounded-xl p-4">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-secondary">
                    {data.completedSongs} completed · {data.failedSongs} failed
                  </span>
                  <span className="font-medium text-primary">
                    {data.totalSongs} total
                  </span>
                </div>
                <div className="w-full h-3 bg-red-100 dark:bg-red-900/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 rounded-full transition-all"
                    style={{ width: `${data.successRate}%` }}
                  />
                </div>
              </div>
            )}

            {/* Generation activity over time */}
            <div className="bg-surface border border-border rounded-xl p-5">
              <h2 className="text-base font-semibold text-primary mb-4">
                Activity (Last 12 Weeks)
              </h2>
              <WeeklyActivityChart data={data.weeklyActivity} />
            </div>

            {/* Genre breakdown */}
            {data.genreBreakdown.length > 0 && (
              <div className="bg-surface border border-border rounded-xl p-5">
                <h2 className="text-base font-semibold text-primary mb-4">
                  Most-Used Genres
                </h2>
                <GenreBarChart data={data.genreBreakdown} />
              </div>
            )}

            {/* Best prompts */}
            {data.bestPrompts.length > 0 ? (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-1">
                  <Icon icon={Lightbulb} className="w-4 h-4 text-yellow-400" />
                  <h2 className="text-base font-semibold text-primary">
                    Your Best Prompts
                  </h2>
                </div>
                <p className="text-xs text-secondary mb-4">
                  Prompts that generated your most favorited and played songs
                </p>
                <div className="space-y-3">
                  {data.bestPrompts.map((p, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 p-3 rounded-lg bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/40"
                    >
                      <span className="text-sm font-bold text-violet-400 w-5 text-right flex-shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-primary line-clamp-2">
                          {p.prompt}
                        </p>
                        <p className="text-xs text-secondary mt-1">
                          {p.favCount > 0 && `${p.favCount} favorite${p.favCount !== 1 ? "s" : ""}`}
                          {p.favCount > 0 && p.plays > 0 && " · "}
                          {p.plays > 0 && `${p.plays} play${p.plays !== 1 ? "s" : ""}`}
                          {p.uses > 1 && ` · used ${p.uses}×`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Icon icon={Sparkles} className="w-4 h-4 text-violet-400" />
                  <h2 className="text-base font-semibold text-primary">
                    Best Prompts
                  </h2>
                </div>
                <p className="text-sm text-secondary">
                  Favorite or play your songs to surface your best-performing prompts here.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </AppShell>
  );
}
