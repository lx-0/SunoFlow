"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
} from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_AXIS_TICK } from "@/lib/chart-config";

export function WeeklyFeedbackChart({
  data,
}: {
  data: Array<{ week: string; likes: number; dislikes: number }>;
}) {
  if (data.every((d) => d.likes === 0 && d.dislikes === 0)) {
    return <p className="text-secondary text-sm">No feedback data yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data}>
        <XAxis
          dataKey="week"
          tick={CHART_AXIS_TICK}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} width={28} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="likes" name="Likes" fill="#22c55e" radius={[3, 3, 0, 0]} />
        <Bar dataKey="dislikes" name="Dislikes" fill="#ef4444" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function TagQualityChart({
  data,
}: {
  data: Array<{ tag: string; likes: number; dislikes: number; total: number; likeRatio: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-secondary text-sm">No tag data yet</p>;
  }
  // Show top 10 by total, display as horizontal bars
  const top = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, top.length * 32)}>
      <BarChart data={top} layout="vertical">
        <XAxis type="number" tick={CHART_AXIS_TICK} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="tag"
          tick={{ fontSize: 11, fill: "#aaa2a5" }}
          width={90}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="likes" name="Likes" fill="#22c55e" radius={[0, 3, 3, 0]} stackId="a" />
        <Bar dataKey="dislikes" name="Dislikes" fill="#ef4444" radius={[0, 3, 3, 0]} stackId="a" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GenreBarChart({
  data,
}: {
  data: Array<{ genre: string; count: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-secondary text-sm">No genre data yet</p>;
  }
  const top = data.slice(0, 10);
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, top.length * 32)}>
      <BarChart data={top} layout="vertical">
        <XAxis type="number" tick={CHART_AXIS_TICK} allowDecimals={false} />
        <YAxis
          type="category"
          dataKey="genre"
          tick={{ fontSize: 11, fill: "#aaa2a5" }}
          width={90}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="count" name="Songs" fill="#d93294" radius={[0, 3, 3, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function WeeklyActivityChart({
  data,
}: {
  data: Array<{ week: string; count: number }>;
}) {
  if (data.every((d) => d.count === 0)) {
    return <p className="text-secondary text-sm">No activity yet</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#2f262a" strokeOpacity={0.4} />
        <XAxis
          dataKey="week"
          tick={CHART_AXIS_TICK}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis tick={CHART_AXIS_TICK} allowDecimals={false} width={28} />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Line
          type="monotone"
          dataKey="count"
          name="Songs"
          stroke="#d93294"
          strokeWidth={2}
          dot={{ fill: "#d93294", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
