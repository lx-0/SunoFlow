"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api-client";
import { Icon } from "@/components/ui/Icon";
import {
  Music,
  Heart,
  ListMusic,
  Star,
  CircleCheck,
  ChartColumn,
  TriangleAlert,
  Sparkles,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const GenerationsBarChart = dynamic(
  () => import("@/components/analytics/UserAnalyticsCharts").then((mod) => mod.GenerationsBarChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-surface-raised rounded" /> }
);

const GenrePieChart = dynamic(
  () => import("@/components/analytics/UserAnalyticsCharts").then((mod) => mod.GenrePieChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-surface-raised rounded" /> }
);

const CreditUsageBarChart = dynamic(
  () => import("@/components/analytics/UserAnalyticsCharts").then((mod) => mod.CreditUsageBarChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-surface-raised rounded" /> }
);

interface CreditUsageData {
  budget: number;
  creditsUsedThisMonth: number;
  creditsRemaining: number;
  generationsThisMonth: number;
  usagePercent: number;
  isLow: boolean;
  totalCreditsAllTime: number;
  totalGenerationsAllTime: number;
  dailyChart: Array<{ date: string; credits: number; count: number }>;
}

interface UserAnalytics {
  totalGenerations: number;
  completedGenerations: number;
  totalFavorites: number;
  totalPlaylists: number;
  averageRating: number | null;
  ratedSongsCount: number;
  genreBreakdown: Array<{ genre: string; count: number }>;
  topSongs: Array<{
    id: string;
    title: string | null;
    tags: string | null;
    downloadCount: number;
    rating: number | null;
    createdAt: string;
  }>;
  dailyGenerations: Array<{ date: string; count: number }>;
}


function StatCard({
  label,
  value,
  icon: ItemIcon,
}: {
  label: string;
  value: string | number;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-secondary">
          {label}
        </span>
        <Icon icon={ItemIcon} className="w-4 h-4 text-muted" />
      </div>
      <div className="text-2xl font-bold text-primary">{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const { data: session } = useSession();
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [creditData, setCreditData] = useState<CreditUsageData | null>(null);
  const [loading, setLoading] = useState(true);
  const currentTier = (session?.user as unknown as Record<string, unknown>)?.subscriptionTier as string ?? "free";

  const fetchData = useCallback(async () => {
    try {
      const [analyticsData, creditData] = await Promise.allSettled([
        apiGet<UserAnalytics>("/api/analytics/user"),
        apiGet<CreditUsageData>("/api/credits"),
      ]);
      if (analyticsData.status === "fulfilled") setData(analyticsData.value);
      if (creditData.status === "fulfilled") setCreditData(creditData.value);
    } catch {
      // keep existing data
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
          <h1 className="text-xl font-bold text-primary mb-6">Analytics</h1>
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!data) {
    return (
      <AppShell>
        <div className="px-4 py-6">
          <p className="text-red-400">Failed to load analytics</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-primary">Analytics</h1>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Songs" value={data.totalGenerations} icon={Music} />
          <StatCard label="Completed" value={data.completedGenerations} icon={CircleCheck} />
          <StatCard label="Favorites" value={data.totalFavorites} icon={Heart} />
          <StatCard label="Playlists" value={data.totalPlaylists} icon={ListMusic} />
          <StatCard
            label="Avg Rating"
            value={data.averageRating !== null ? `${data.averageRating}\u2605` : "\u2014"}
            icon={Star}
          />
          <StatCard label="Rated Songs" value={data.ratedSongsCount} icon={ChartColumn} />
        </div>

        {/* Credit Usage Widget */}
        {creditData && (
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-primary">
                Credit Usage
              </h2>
              {creditData.isLow && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-full">
                  <Icon icon={TriangleAlert} className="w-3.5 h-3.5" />
                  Low Credits
                </span>
              )}
            </div>

            {/* Usage bar */}
            <div>
              <div className="flex items-center justify-between text-sm mb-1.5">
                <span className="text-secondary">
                  {creditData.creditsUsedThisMonth} / {creditData.budget} credits used
                </span>
                <span className="font-medium text-primary">
                  {creditData.creditsRemaining} remaining
                </span>
              </div>
              <div className="w-full h-2.5 bg-surface-raised rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    creditData.isLow
                      ? "bg-amber-500"
                      : creditData.usagePercent > 50
                        ? "bg-violet-500"
                        : "bg-green-500"
                  }`}
                  style={{ width: `${Math.min(100, creditData.usagePercent)}%` }}
                />
              </div>
            </div>

            {/* Quick stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{creditData.generationsThisMonth}</p>
                <p className="text-xs text-secondary">Generations this month</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{creditData.creditsUsedThisMonth}</p>
                <p className="text-xs text-secondary">Credits used</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">
                  {creditData.generationsThisMonth > 0
                    ? Math.round(creditData.creditsUsedThisMonth / Math.max(1, new Date().getDate()))
                    : 0}
                </p>
                <p className="text-xs text-secondary">Daily average</p>
              </div>
              <div className="text-center">
                <p className="text-lg font-bold text-primary">{creditData.totalCreditsAllTime}</p>
                <p className="text-xs text-secondary">All-time credits</p>
              </div>
            </div>

            {/* Upgrade CTA — shown when credits are low and user is on free tier */}
            {creditData.isLow && currentTier === "free" && (
              <div className="flex items-start justify-between gap-4 p-4 rounded-xl bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 border border-violet-200 dark:border-violet-800">
                <div className="flex items-start gap-3">
                  <Icon icon={Sparkles} className="w-5 h-5 text-violet-600 dark:text-violet-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-violet-900 dark:text-violet-200">
                      Running low on credits
                    </p>
                    <p className="text-xs text-violet-700 dark:text-violet-400 mt-0.5">
                      Upgrade to get up to 15,000 credits/month plus higher generation speeds.
                    </p>
                  </div>
                </div>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-1 flex-shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
                >
                  Upgrade
                  <Icon icon={ArrowRight} className="w-3.5 h-3.5" />
                </Link>
              </div>
            )}

            {/* Daily credit chart */}
            <div>
              <h3 className="text-sm font-medium text-secondary mb-2">
                Daily Credit Usage
              </h3>
              <CreditUsageBarChart data={creditData.dailyChart} />
            </div>
          </div>
        )}

        {/* Generations chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-primary mb-4">
            Generations (Last 30 Days)
          </h2>
          <GenerationsBarChart data={data.dailyGenerations} />
        </div>

        {/* Genre breakdown */}
        {data.genreBreakdown.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-primary mb-4">
              Genre Breakdown
            </h2>
            <GenrePieChart data={data.genreBreakdown} />
          </div>
        )}

        {/* Top songs by downloads */}
        {data.topSongs.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-primary mb-4">
              Most Downloaded Songs
            </h2>
            <div className="divide-y divide-border">
              {data.topSongs.map((song, i) => (
                <div key={song.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-sm font-bold text-secondary w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-primary truncate">
                      {song.title ?? "Untitled"}
                    </p>
                    {song.tags && (
                      <p className="text-xs text-secondary truncate">
                        {song.tags}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-primary">
                      {song.downloadCount}
                    </p>
                    <p className="text-xs text-muted">downloads</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
