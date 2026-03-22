"use client";

import { useEffect, useState, useCallback } from "react";
import {
  UsersIcon,
  MusicalNoteIcon,
  BoltIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface AdminAnalytics {
  totalUsers: number;
  totalGenerations: number;
  generationsInRange: number;
  generationsToday: number;
  activeUsersWeek: number;
  range: string;
  dailyGenerations: Array<{ date: string; count: number }>;
  dailyActiveUsers: Array<{ date: string; count: number }>;
  popularGenres: Array<{ genre: string; count: number }>;
  topCreators: Array<{
    userId: string;
    name: string | null;
    email: string | null;
    count: number;
  }>;
}

const RANGE_OPTIONS = [
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "all", label: "All time" },
];

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
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-400">{label}</span>
        <Icon className="w-5 h-5 text-gray-500" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("30d");

  const fetchData = useCallback(async (r: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/analytics/admin?range=${r}`);
      if (res.ok) setData(await res.json());
    } catch {
      // keep existing data
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData(range);
  }, [range, fetchData]);

  const handleRangeChange = (newRange: string) => {
    setRange(newRange);
  };

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-red-400">Failed to load analytics</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold">Platform Analytics</h1>
        <div className="flex gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
          {RANGE_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => handleRangeChange(opt.value)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                range === opt.value
                  ? "bg-violet-600 text-white"
                  : "text-gray-400 hover:text-white"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={data.totalUsers} icon={UsersIcon} />
        <StatCard label="Total Generations" value={data.totalGenerations} icon={MusicalNoteIcon} />
        <StatCard label="Today" value={data.generationsToday} icon={BoltIcon} />
        <StatCard label="Active (7d)" value={data.activeUsersWeek} icon={UserGroupIcon} />
      </div>

      {/* Generations per day chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Generations Per Day</h2>
        {data.dailyGenerations.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
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
                width={40}
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
          <p className="text-gray-500 text-sm">No data for this period</p>
        )}
      </div>

      {/* Daily Active Users chart */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Daily Active Users</h2>
        {data.dailyActiveUsers.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data.dailyActiveUsers}>
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
              <Line
                type="monotone"
                dataKey="count"
                stroke="#7c3aed"
                strokeWidth={2}
                dot={{ fill: "#7c3aed", r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-gray-500 text-sm">No data for this period</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Popular genres */}
        {data.popularGenres.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Popular Genres</h2>
            <div className="flex flex-col items-center gap-4">
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={data.popularGenres}
                    dataKey="count"
                    nameKey="genre"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    innerRadius={40}
                  >
                    {data.popularGenres.map((_, i) => (
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
              <div className="flex flex-wrap gap-2 justify-center">
                {data.popularGenres.map((g, i) => (
                  <span
                    key={g.genre}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
                    style={{
                      backgroundColor: `${PIE_COLORS[i % PIE_COLORS.length]}20`,
                      color: PIE_COLORS[i % PIE_COLORS.length],
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    {g.genre} ({g.count})
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Top creators */}
        {data.topCreators.length > 0 && (
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
            <h2 className="text-lg font-semibold mb-4">Top Creators</h2>
            <div className="divide-y divide-gray-800">
              {data.topCreators.map((creator, i) => (
                <div key={creator.userId} className="flex items-center gap-3 py-2.5">
                  <span className="text-sm font-bold text-gray-500 w-5 text-right">
                    {i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {creator.name || creator.email || "Unknown"}
                    </p>
                    {creator.name && creator.email && (
                      <p className="text-xs text-gray-500 truncate">{creator.email}</p>
                    )}
                  </div>
                  <span className="text-sm font-semibold text-violet-400">
                    {creator.count}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
