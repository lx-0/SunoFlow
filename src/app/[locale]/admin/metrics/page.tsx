"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { apiGet } from "@/lib/api-client";
import { Users, Music, Zap, UsersRound, CircleDollarSign, CreditCard, ExternalLink, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

interface MetricsData {
  totalUsers: number;
  newUsersToday: number;
  activeUsers7d: number;
  activeUsers30d: number;
  totalSongs: number;
  songsToday: number;
  mrrCents: number;
  tierBreakdown: Record<string, number>;
  creditUsageMonth: number;
  topSongs: Array<{
    id: string;
    title: string | null;
    playCount: number;
    imageUrl: string | null;
    creator: { id: string; name: string | null; email: string | null };
  }>;
  dailySignups: Array<{ date: string; count: number }>;
  dailyGenerations: Array<{ date: string; count: number }>;
}

function StatCard({
  label,
  value,
  sub,
  icon: ItemIcon,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: LucideIcon;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-secondary">{label}</span>
        <Icon icon={ItemIcon} className="w-5 h-5 text-muted" />
      </div>
      <div className="text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}

function BarChart({ data, label }: { data: Array<{ date: string; count: number }>; label: string }) {
  if (data.length === 0) return <p className="text-muted text-sm">No data</p>;
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div>
      <p className="text-xs text-muted mb-3">{label}</p>
      <div className="flex items-end gap-0.5 h-32">
        {data.map((d) => (
          <div key={d.date} className="flex-1 group relative" title={`${d.date}: ${d.count}`}>
            <div
              className="bg-violet-500/70 hover:bg-violet-400 rounded-t transition-colors w-full"
              style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? "2px" : "0" }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-surface-raised text-xs text-primary px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
              {d.date}: {d.count}
            </div>
          </div>
        ))}
      </div>
      <div className="flex justify-between text-xs text-gray-600 mt-1">
        <span>{data[0]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function formatMrr(cents: number): string {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

const TIER_COLORS: Record<string, string> = {
  free: "bg-gray-800 text-gray-400",
  starter: "bg-blue-900/30 text-blue-400",
  pro: "bg-violet-900/30 text-violet-400",
  studio: "bg-amber-900/30 text-amber-400",
};

export default function AdminMetricsPage() {
  const [data, setData] = useState<MetricsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<MetricsData>("/api/admin/metrics")
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-violet-400" />
      </div>
    );
  }

  if (!data) {
    return <p className="text-red-400">Failed to load metrics</p>;
  }

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold">Platform Metrics</h1>

      {/* Users */}
      <section>
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={data.totalUsers} icon={Users} />
          <StatCard label="New Today" value={data.newUsersToday} icon={Users} />
          <StatCard label="Active (7d)" value={data.activeUsers7d} icon={UsersRound} />
          <StatCard label="Active (30d)" value={data.activeUsers30d} icon={UsersRound} />
        </div>
      </section>

      {/* Daily Signups Chart */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">New Signups (Last 30 Days)</h2>
        <BarChart data={data.dailySignups} label="New user registrations per day" />
      </div>

      {/* Songs */}
      <section>
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Generations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Songs" value={data.totalSongs} icon={Music} />
          <StatCard label="Generated Today" value={data.songsToday} icon={Zap} />
        </div>
      </section>

      {/* Daily Generations Chart */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Generations Per Day (Last 30 Days)</h2>
        <BarChart data={data.dailyGenerations} label="Songs generated per day" />
      </div>

      {/* Revenue */}
      <section>
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Revenue &amp; Credits</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Est. MRR"
            value={formatMrr(data.mrrCents)}
            sub="approximate"
            icon={CircleDollarSign}
          />
          <StatCard
            label="Credits Used (MTD)"
            value={data.creditUsageMonth.toLocaleString()}
            sub="this month"
            icon={CreditCard}
          />
        </div>
      </section>

      {/* Tier breakdown */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Subscription Tiers</h2>
        <div className="flex flex-wrap gap-3">
          {(["free", "starter", "pro", "studio"] as const).map((tier) => (
            <div key={tier} className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full capitalize font-medium ${TIER_COLORS[tier] ?? "bg-gray-800 text-gray-400"}`}>
                {tier}
              </span>
              <span className="text-sm font-semibold">{data.tierBreakdown[tier] ?? 0}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Top Songs by Plays */}
      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-lg font-semibold">Top Songs by Plays</h2>
        </div>
        {data.topSongs.length === 0 ? (
          <p className="px-5 py-6 text-muted text-sm">No songs yet</p>
        ) : (
          <div className="divide-y divide-border">
            {data.topSongs.map((song, i) => (
              <div key={song.id} className="flex items-center gap-3 px-5 py-3">
                <span className="text-sm font-bold text-muted w-5 text-right">{i + 1}</span>
                <div className="relative flex-shrink-0 w-9 h-9 rounded-lg bg-surface-raised overflow-hidden">
                  {song.imageUrl ? (
                    <Image src={song.imageUrl} alt={song.title ?? "Song"} fill className="object-cover" sizes="36px" />
                  ) : (
                    <Icon icon={Music} className="w-4 h-4 text-gray-600 m-auto mt-2.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{song.title ?? "Untitled"}</p>
                  <p className="text-xs text-muted truncate">
                    {song.creator.name ?? song.creator.email ?? "Unknown"}
                  </p>
                </div>
                <span className="text-sm font-semibold text-violet-400 tabular-nums">
                  {song.playCount.toLocaleString()} plays
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Error Rate / Sentry */}
      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-2">Error Monitoring</h2>
        <p className="text-sm text-secondary mb-3">
          Error rate and issue tracking is handled by Sentry. View the Sentry dashboard for detailed error reports, stack traces, and performance monitoring.
        </p>
        <a
          href="https://sentry.io"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-surface-raised hover:bg-surface-hover text-gray-300 transition-colors"
        >
          <Icon icon={ExternalLink} className="w-4 h-4" />
          Open Sentry Dashboard
        </a>
      </div>
    </div>
  );
}
