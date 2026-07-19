"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { AppShell } from "@/components/AppShell";
import { apiGet } from "@/lib/api-client";
import { Icon } from "@/components/ui/Icon";
import {
  Music,
  Clock,
  Flame,
  CircleCheck,
  Sparkles,
  ChartColumn,
  Zap,
  CalendarDays,
  type LucideIcon,
} from "lucide-react";

const ListeningTimeChart = dynamic(
  () => import("@/components/analytics/StatsCharts").then((m) => m.ListeningTimeChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-surface-raised rounded" /> }
);

const PeakHoursChart = dynamic(
  () => import("@/components/analytics/StatsCharts").then((m) => m.PeakHoursChart),
  { ssr: false, loading: () => <div className="h-[140px] animate-pulse bg-surface-raised rounded" /> }
);

const StatsCreditChart = dynamic(
  () => import("@/components/analytics/StatsCharts").then((m) => m.StatsCreditChart),
  { ssr: false, loading: () => <div className="h-[200px] animate-pulse bg-surface-raised rounded" /> }
);

interface UserStats {
  totalSongsGenerated: number;
  completedGenerations: number;
  successRate: number;
  totalListeningTimeSec: number;
  songsThisWeek: number;
  songsLastWeek: number;
  songsThisMonth: number;
  songsLastMonth: number;
  weekTrend: number;
  monthTrend: number;
  playCountThisWeek: number;
  mostPlayedSongs: Array<{
    id: string;
    title: string | null;
    tags: string | null;
    playCount: number;
    duration: number | null;
    imageUrl: string | null;
    createdAt: string;
  }>;
  favoriteGenres: Array<{ genre: string; count: number }>;
  dailyListeningTime: Array<{ date: string; seconds: number; minutes: number }>;
  peakHours: Array<{ hour: number; count: number }>;
  currentStreak: number;
  longestStreak: number;
  creditUsageByDay: Array<{ date: string; credits: number; count: number }>;
  totalCreditsUsed: number;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${seconds}s`;
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

function TrendBadge({ value }: { value: number }) {
  if (value === 0) return <span className="text-xs text-secondary">same as last</span>;
  const positive = value > 0;
  return (
    <span
      className={`inline-flex items-center text-xs font-medium ${
        positive ? "text-green-500" : "text-red-400"
      }`}
    >
      {positive ? "▲" : "▼"} {Math.abs(value)}
    </span>
  );
}

function StatCard({
  label,
  value,
  sub,
  icon: ItemIcon,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: React.ReactNode;
  icon: LucideIcon;
  accent?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-secondary">
          {label}
        </span>
        <Icon icon={ItemIcon} className={`w-4 h-4 ${accent ?? "text-muted"}`} />
      </div>
      <div className="text-2xl font-bold text-primary">{value}</div>
      {sub && <div className="mt-1">{sub}</div>}
    </div>
  );
}

export default function StatsPage() {
  const [data, setData] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      setData(await apiGet<UserStats>("/api/stats/user"));
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
          <h1 className="text-xl font-bold text-primary mb-6">My Stats</h1>
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
          <p className="text-red-400">Failed to load stats</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-4 py-6 space-y-6">
        <h1 className="text-xl font-bold text-primary">My Stats</h1>

        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard
            label="Songs Generated"
            value={data.totalSongsGenerated}
            icon={Music}
            sub={<TrendBadge value={data.monthTrend} />}
          />
          <StatCard
            label="Listening Time"
            value={formatDuration(data.totalListeningTimeSec)}
            icon={Clock}
            accent="text-cyan-500"
          />
          <StatCard
            label="Success Rate"
            value={`${data.successRate}%`}
            icon={CircleCheck}
            accent="text-green-500"
          />
          <StatCard
            label="This Week"
            value={data.songsThisWeek}
            icon={CalendarDays}
            sub={<TrendBadge value={data.weekTrend} />}
          />
          <StatCard
            label="Current Streak"
            value={`${data.currentStreak}d`}
            icon={Flame}
            accent="text-orange-500"
            sub={
              <span className="text-xs text-secondary">Best: {data.longestStreak}d</span>
            }
          />
          <StatCard
            label="Credits Used"
            value={data.totalCreditsUsed}
            icon={Zap}
            accent="text-amber-500"
          />
        </div>

        {/* Most-played songs */}
        {data.mostPlayedSongs.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
              <Icon icon={ChartColumn} className="w-4 h-4 text-violet-500" />
              Most-Played Songs
            </h2>
            <div className="divide-y divide-border">
              {data.mostPlayedSongs.map((song, i) => (
                <div key={song.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-sm font-bold text-secondary w-5 text-right flex-shrink-0">
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
                      {song.playCount}
                    </p>
                    <p className="text-xs text-muted">plays</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Listening time chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <Icon icon={Clock} className="w-4 h-4 text-cyan-500" />
            Daily Listening Time (Last 30 Days)
          </h2>
          <ListeningTimeChart data={data.dailyListeningTime} />
        </div>

        {/* Peak listening hours */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-primary mb-1 flex items-center gap-2">
            <Icon icon={Sparkles} className="w-4 h-4 text-amber-500" />
            Peak Listening Hours
          </h2>
          <p className="text-xs text-secondary mb-4">
            When you listen most throughout the day
          </p>
          <PeakHoursChart data={data.peakHours} />
        </div>

        {/* Favorite genres */}
        {data.favoriteGenres.length > 0 && (
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
              <Icon icon={Sparkles} className="w-4 h-4 text-violet-500" />
              Favorite Genres &amp; Styles
            </h2>
            <div className="flex flex-wrap gap-2">
              {data.favoriteGenres.map((g, i) => {
                const colors = [
                  "#c40181", "#06b6d4", "#f59e0b", "#10b981", "#ef4444",
                  "#d93294", "#3b82f6", "#ec4899", "#14b8a6", "#f97316",
                ];
                const color = colors[i % colors.length];
                return (
                  <span
                    key={g.genre}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${color}20`,
                      color,
                    }}
                  >
                    {g.genre}
                    <span className="opacity-60 text-xs">{g.count}</span>
                  </span>
                );
              })}
            </div>
          </div>
        )}

        {/* Generation insights */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <Icon icon={Music} className="w-4 h-4 text-violet-500" />
            Generation Insights
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-primary">
                {data.totalSongsGenerated}
              </p>
              <p className="text-xs text-secondary">Total generated</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">
                {data.completedGenerations}
              </p>
              <p className="text-xs text-secondary">Completed</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">
                {data.successRate}%
              </p>
              <p className="text-xs text-secondary">Success rate</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-primary">
                {data.songsThisMonth}
              </p>
              <p className="text-xs text-secondary">This month</p>
            </div>
          </div>
        </div>

        {/* Credit usage chart */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-base font-semibold text-primary mb-4 flex items-center gap-2">
            <Icon icon={Zap} className="w-4 h-4 text-amber-500" />
            Credit Usage (Last 30 Days)
          </h2>
          <StatsCreditChart data={data.creditUsageByDay} />
        </div>
      </div>
    </AppShell>
  );
}
