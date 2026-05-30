"use client";

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
import { CHART_TOOLTIP_STYLE, CHART_PIE_COLORS, CHART_AXIS_TICK } from "@/lib/chart-config";

export function GenerationsBarChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">No data yet</p>;
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
          width={30}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="count" fill="#7c3aed" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function CreditUsageBarChart({
  data,
}: {
  data: Array<{ date: string; credits: number; count: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400 text-sm">No data yet</p>;
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
          width={30}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="credits" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Credits" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function GenrePieChart({
  data,
}: {
  data: Array<{ genre: string; count: number }>;
}) {
  return (
    <div className="flex flex-col sm:flex-row items-center gap-4">
      <ResponsiveContainer width="100%" height={200} className="sm:max-w-[200px]">
        <PieChart>
          <Pie
            data={data}
            dataKey="count"
            nameKey="genre"
            cx="50%"
            cy="50%"
            outerRadius={80}
            innerRadius={40}
          >
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_PIE_COLORS[i % CHART_PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-2">
        {data.map((g, i) => (
          <span
            key={g.genre}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium"
            style={{
              backgroundColor: `${CHART_PIE_COLORS[i % CHART_PIE_COLORS.length]}20`,
              color: CHART_PIE_COLORS[i % CHART_PIE_COLORS.length],
            }}
          >
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: CHART_PIE_COLORS[i % CHART_PIE_COLORS.length] }}
            />
            {g.genre}
            <span className="opacity-60">{g.count}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
