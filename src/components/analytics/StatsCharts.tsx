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
} from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK } from "@/lib/chart-config";

// Listening time bar chart (minutes per day)
export function ListeningTimeChart({
  data,
}: {
  data: Array<{ date: string; minutes: number }>;
}) {
  if (data.every((d) => d.minutes === 0)) {
    return <p className="text-secondary text-sm">No listening data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis
          dataKey="date"
          tick={CHART_AXIS_TICK}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          allowDecimals={false}
          width={35}
          tickFormatter={(v: number) => `${v}m`}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="minutes" fill="#06b6d4" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Generation trend line chart (30 days)
export function GenerationTrendChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  if (data.every((d) => d.count === 0)) {
    return <p className="text-secondary text-sm">No generation data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2f262a" />
        <XAxis
          dataKey="date"
          tick={CHART_AXIS_TICK}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          allowDecimals={false}
          width={30}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="count"
          stroke="#c40181"
          strokeWidth={2}
          dot={false}
          name="Generations"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

// Peak listening hours heatmap (24-bar chart)
export function PeakHoursChart({
  data,
}: {
  data: Array<{ hour: number; count: number }>;
}) {
  const formatted = data.map((d) => ({
    hour: `${d.hour.toString().padStart(2, "0")}:00`,
    count: d.count,
  }));

  if (data.every((d) => d.count === 0)) {
    return <p className="text-secondary text-sm">No listening data yet</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={formatted} barSize={14}>
        <XAxis
          dataKey="hour"
          tick={{ fontSize: 9, fill: "#aaa2a5" }}
          interval={2}
        />
        <YAxis hide />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar
          dataKey="count"
          radius={[3, 3, 0, 0]}
          fill="#f59e0b"
        />
      </BarChart>
    </ResponsiveContainer>
  );
}

// Credit usage bar chart
export function StatsCreditChart({
  data,
}: {
  data: Array<{ date: string; credits: number }>;
}) {
  if (data.every((d) => d.credits === 0)) {
    return <p className="text-secondary text-sm">No credit usage yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis
          dataKey="date"
          tick={CHART_AXIS_TICK}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          allowDecimals={false}
          width={35}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="credits" fill="#f59e0b" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
