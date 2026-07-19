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
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { CHART_TOOLTIP_STYLE, CHART_PIE_COLORS, CHART_AXIS_TICK } from "@/lib/chart-config";

export function AdminGenerationsBarChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-secondary text-sm">No data for this period</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={250}>
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
          width={40}
        />
        <Tooltip contentStyle={CHART_TOOLTIP_STYLE} />
        <Bar dataKey="count" fill="#c40181" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DailyActiveUsersChart({
  data,
}: {
  data: Array<{ date: string; count: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-secondary text-sm">No data for this period</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data}>
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
          dot={{ fill: "#c40181", r: 3 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function QualityTrendChart({
  data,
}: {
  data: Array<{ week: string; likes: number; dislikes: number; score: number }>;
}) {
  if (data.length === 0) {
    return <p className="text-secondary text-sm">No data for this period</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data}>
        <XAxis
          dataKey="week"
          tick={CHART_AXIS_TICK}
          tickFormatter={(v: string) => v.slice(5)}
          interval="preserveStartEnd"
        />
        <YAxis
          tick={CHART_AXIS_TICK}
          domain={[0, 100]}
          tickFormatter={(v: number) => `${v}%`}
          width={42}
        />
        <Tooltip
          contentStyle={CHART_TOOLTIP_STYLE}
          formatter={(value) => [`${value}%`, "Quality Score"]}
          labelFormatter={(label) => `Week of ${label}`}
        />
        <Legend
          wrapperStyle={{ fontSize: "11px", color: "#aaa2a5" }}
        />
        <Line
          type="monotone"
          dataKey="score"
          name="Quality Score (%)"
          stroke="#c40181"
          strokeWidth={2}
          dot={{ fill: "#c40181", r: 3 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function AdminGenrePieChart({
  data,
}: {
  data: Array<{ genre: string; count: number }>;
}) {
  return (
    <div className="flex flex-col items-center gap-4">
      <ResponsiveContainer width="100%" height={200}>
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
      <div className="flex flex-wrap gap-2 justify-center">
        {data.map((g, i) => (
          <span
            key={g.genre}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: `${CHART_PIE_COLORS[i % CHART_PIE_COLORS.length]}20`,
              color: CHART_PIE_COLORS[i % CHART_PIE_COLORS.length],
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full"
              style={{ backgroundColor: CHART_PIE_COLORS[i % CHART_PIE_COLORS.length] }}
            />
            {g.genre} ({g.count})
          </span>
        ))}
      </div>
    </div>
  );
}
