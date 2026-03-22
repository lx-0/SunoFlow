"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/AppShell";
import {
  MusicalNoteIcon,
  HeartIcon,
  QueueListIcon,
  StarIcon,
  CheckCircleIcon,
  ChartBarIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

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

const PIE_COLORS = [
  "#7c3aed", "#a78bfa", "#c4b5fd", "#8b5cf6", "#6d28d9",
  "#5b21b6", "#4c1d95", "#ddd6fe", "#ede9fe", "#f5f3ff",
];

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs font-medium uppercase tracking-wide text-gray-500 dark:text-gray-400">
          {label}
        </span>
        <Icon className="w-4 h-4 text-gray-400 dark:text-gray-500" />
      </div>
      <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<UserAnalytics | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/analytics/user");
      if (res.ok) setData(await res.json());
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
          <h1 className="text-xl font-bold text-gray-900 dark:text-white mb-6">Analytics</h1>
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
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Analytics</h1>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <StatCard label="Total Songs" value={data.totalGenerations} icon={MusicalNoteIcon} />
          <StatCard label="Completed" value={data.completedGenerations} icon={CheckCircleIcon} />
          <StatCard label="Favorites" value={data.totalFavorites} icon={HeartIcon} />
          <StatCard label="Playlists" value={data.totalPlaylists} icon={QueueListIcon} />
          <StatCard
            label="Avg Rating"
            value={data.averageRating !== null ? `${data.averageRating}\u2605` : "\u2014"}
            icon={StarIcon}
          />
          <StatCard label="Rated Songs" value={data.ratedSongsCount} icon={ChartBarIcon} />
        </div>

        {/* Generations chart */}
        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
          <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
            Generations (Last 30 Days)
          </h2>
          {data.dailyGenerations.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={data.dailyGenerations}>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  tickFormatter={(v: string) => v.slice(5)}
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "#9ca3af" }}
                  allowDecimals={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#1f2937",
                    border: "1px solid #374151",
                    borderRadius: "8px",
                    fontSize: "12px",
                    color: "#fff",
                  }}
                />
                <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-sm">No data yet</p>
          )}
        </div>

        {/* Genre breakdown */}
        {data.genreBreakdown.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Genre Breakdown
            </h2>
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <ResponsiveContainer width="100%" height={200} className="sm:max-w-[200px]">
                <PieChart>
                  <Pie
                    data={data.genreBreakdown}
                    dataKey="count"
                    nameKey="genre"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.genreBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1f2937",
                      border: "1px solid #374151",
                      borderRadius: "8px",
                      fontSize: "12px",
                      color: "#fff",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-2">
                {data.genreBreakdown.map((g, i) => (
                  <span
                    key={g.genre}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
                    style={{
                      backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}20`,
                      color: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {g.genre}
                    <span className="opacity-60">{g.count}</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top songs by downloads */}
        {data.topSongs.length > 0 && (
          <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5">
            <h2 className="text-base font-semibold text-gray-800 dark:text-gray-200 mb-4">
              Most Downloaded Songs
            </h2>
            <div className="divide-y divide-gray-100 dark:divide-gray-800">
              {data.topSongs.map((song, i) => (
                <div key={song.id} className="flex items-center gap-3 py-2.5">
                  <span className="text-sm font-bold text-gray-400 w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {song.title ?? "Untitled"}
                    </p>
                    {song.tags && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {song.tags}
                      </p>
                    )}
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {song.downloadCount}
                    </p>
                    <p className="text-xs text-gray-500">downloads</p>
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
