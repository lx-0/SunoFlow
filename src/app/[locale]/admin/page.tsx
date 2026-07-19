"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api-client";
import { Users, Music, Zap, UsersRound, Flag, TriangleAlert, CreditCard, CircleDollarSign, CalendarDays, Calendar, type LucideIcon } from "lucide-react";
import { Icon } from "@/components/ui/Icon";

interface Stats {
  totalUsers: number;
  payingUsers: number;
  mrrCents: number;
  totalGenerations: number;
  generationsToday: number;
  generationsWeek: number;
  generationsMonth: number;
  activeUsers7d: number;
  activeUsers30d: number;
  pendingReports: number;
  recentErrors: number;
  dailyGenerations: Array<{ date: string; count: number }>;
}

function StatCard({
  label,
  value,
  icon: ItemIcon,
  sub,
}: {
  label: string;
  value: number | string;
  icon: LucideIcon;
  sub?: string;
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

function MiniChart({ data }: { data: Array<{ date: string; count: number }> }) {
  if (data.length === 0) {
    return <p className="text-muted text-sm">No data available</p>;
  }

  const max = Math.max(...data.map((d) => d.count), 1);

  return (
    <div className="flex items-end gap-1 h-40">
      {data.map((d) => (
        <div
          key={d.date}
          className="flex-1 group relative"
          title={`${d.date}: ${d.count}`}
        >
          <div
            className="bg-violet-500/80 hover:bg-violet-400 rounded-t transition-colors w-full"
            style={{ height: `${(d.count / max) * 100}%`, minHeight: d.count > 0 ? "2px" : "0" }}
          />
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block bg-surface-raised text-xs text-primary px-2 py-1 rounded whitespace-nowrap z-10">
            {d.date}: {d.count}
          </div>
        </div>
      ))}
    </div>
  );
}

function formatMrr(cents: number): string {
  if (cents === 0) return "$0";
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<Stats>("/api/admin/stats")
      .then(setStats)
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

  if (!stats) {
    return <p className="text-red-400">Failed to load stats</p>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Admin Dashboard</h1>

      <div>
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Users</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Users" value={stats.totalUsers} icon={Users} />
          <StatCard label="Paying Users" value={stats.payingUsers} icon={CreditCard} />
          <StatCard label="Active (7d)" value={stats.activeUsers7d} icon={UsersRound} />
          <StatCard label="Active (30d)" value={stats.activeUsers30d} icon={UsersRound} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Revenue</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard
            label="Est. MRR"
            value={formatMrr(stats.mrrCents)}
            icon={CircleDollarSign}
            sub="approximate"
          />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">Generations</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="All Time" value={stats.totalGenerations} icon={Music} />
          <StatCard label="Today" value={stats.generationsToday} icon={Zap} />
          <StatCard label="This Week" value={stats.generationsWeek} icon={CalendarDays} />
          <StatCard label="This Month" value={stats.generationsMonth} icon={Calendar} />
        </div>
      </div>

      <div>
        <h2 className="text-sm font-medium text-secondary uppercase tracking-wider mb-3">System</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Pending Reports" value={stats.pendingReports} icon={Flag} />
          <StatCard label="Errors Today" value={stats.recentErrors} icon={TriangleAlert} />
        </div>
      </div>

      <div className="bg-surface border border-border rounded-xl p-5">
        <h2 className="text-lg font-semibold mb-4">Daily Generations (Last 30 Days)</h2>
        <MiniChart data={stats.dailyGenerations} />
      </div>
    </div>
  );
}
