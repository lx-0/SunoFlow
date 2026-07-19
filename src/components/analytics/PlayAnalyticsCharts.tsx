"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  AreaChart,
  Area,
} from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK } from "@/lib/chart-config";

export function DailyPlaysLineChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: d.date.slice(5), // MM-DD
  }));

  return (
    <ResponsiveContainer width="100%" height={180}>
      <AreaChart data={formatted}>
        <defs>
          <linearGradient id="playsGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#7c3aed" stopOpacity={0.3} />
            <stop offset="95%" stopColor="#7c3aed" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#2f262a" vertical={false} />
        <XAxis
          dataKey="label"
          tick={CHART_AXIS_TICK}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          allowDecimals={false}
          width={28}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} labelFormatter={(v) => `Date: ${v}`} />
        <Area
          type="monotone"
          dataKey="count"
          stroke="#c40181"
          strokeWidth={2}
          fill="url(#playsGradient)"
          name="Plays"
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function TopSongsBarChart({
  data,
}: {
  data: Array<{ title: string; plays: number }>;
}) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} layout="vertical">
        <XAxis
          type="number"
          tick={CHART_AXIS_TICK}
          allowDecimals={false}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          type="category"
          dataKey="title"
          tick={{ fontSize: 11, fill: "#f5f0f2" }}
          width={120}
          tickLine={false}
          axisLine={false}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="plays" fill="#c40181" radius={[0, 4, 4, 0]} name="Plays" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function RetentionCurveChart({
  data,
  songDuration,
}: {
  data: Array<{ pct: number; count: number; rate: number }>;
  songDuration: number | null;
}) {
  const formatted = data.map((d) => ({
    ...d,
    label: songDuration
      ? `${Math.round((d.pct / 100) * songDuration)}s`
      : `${d.pct}%`,
  }));

  return (
    <ResponsiveContainer width="100%" height={160}>
      <LineChart data={formatted}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2f262a" vertical={false} />
        <XAxis
          dataKey="label"
          tick={CHART_AXIS_TICK}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          tickFormatter={(v) => `${Math.round(v)}%`}
          width={36}
          tickLine={false}
          axisLine={false}
          domain={[0, 100]}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(v) => [`${Math.round(Number(v))}%`, "Retention"]}
        />
        <Line
          type="monotone"
          dataKey="rate"
          stroke="#e873af"
          strokeWidth={2}
          dot={false}
          name="Retention"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
