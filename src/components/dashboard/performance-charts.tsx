"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import type { PlayerDashboardStats } from "@/lib/services/player-statistics";

type PerformanceChartsProps = Pick<
  PlayerDashboardStats,
  "matchPerformance" | "gamePerformance" | "performanceTrend" | "winLossDistribution"
>;

const tooltipStyle = {
  borderRadius: "12px",
  border: "1px solid #e2e8f0",
  boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)",
};

function ChartEmptyState() {
  return (
    <div className="flex h-64 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center">
      <p className="text-sm font-semibold text-slate-700">No match data yet</p>
      <p className="mt-1 max-w-xs text-sm leading-5 text-slate-500">
        This chart will appear after completed matches have been recorded.
      </p>
    </div>
  );
}

function ChartPanel({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="mb-5">
        <h2 className="font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {children}
    </Card>
  );
}

export function PerformanceCharts({
  matchPerformance,
  gamePerformance,
  performanceTrend,
  winLossDistribution,
}: PerformanceChartsProps) {
  return (
    <section aria-label="Performance charts" className="mt-8 grid gap-5 xl:grid-cols-2">
      <ChartPanel title="Match performance" description="Completed wins and losses over time">
        {matchPerformance.length === 0 ? (
          <ChartEmptyState />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={matchPerformance} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="wins" name="Wins" stroke="#0B82FF" strokeWidth={2.5} dot={false} />
                <Line type="monotone" dataKey="losses" name="Losses" stroke="#f97373" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>

      <ChartPanel title="Win/loss distribution" description="Share of completed match results">
        {winLossDistribution.length === 0 ? (
          <ChartEmptyState />
        ) : (
          <WinLossChart data={winLossDistribution} />
        )}
      </ChartPanel>

      <ChartPanel title="Games performance" description="Games won compared with games lost">
        {gamePerformance.length === 0 ? (
          <ChartEmptyState />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gamePerformance} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="won" name="Won" fill="#0B82FF" radius={[5, 5, 0, 0]} />
                <Bar dataKey="lost" name="Lost" fill="#f97373" radius={[5, 5, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>

      <ChartPanel title="Recent performance trend" description="Win rate across completed matches">
        {performanceTrend.length === 0 ? (
          <ChartEmptyState />
        ) : (
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceTrend} margin={{ top: 8, right: 12, left: -20, bottom: 4 }}>
                <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <YAxis domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} />
                <Tooltip formatter={(value) => [`${value}%`, "Win rate"]} contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="winRate" name="Win rate" stroke="#0B82FF" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </ChartPanel>
    </section>
  );
}

function WinLossChart({
  data,
}: {
  data: PerformanceChartsProps["winLossDistribution"];
}) {
  const total = data.reduce((sum, entry) => sum + entry.value, 0);

  return (
    <div className="relative h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={3}>
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.name === "Wins" ? "#0B82FF" : "#f97373"} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value, name) => [
              `${value} (${total > 0 ? ((Number(value) / total) * 100).toFixed(1) : 0}%)`,
              name,
            ]}
            contentStyle={tooltipStyle}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-600">
        {total} matches
      </div>
      <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-5 text-xs text-slate-600">
        {data.map((entry) => (
          <span key={entry.name} className="inline-flex items-center gap-1.5">
            <span className={`h-2 w-2 rounded-full ${entry.name === "Wins" ? "bg-[#0B82FF]" : "bg-[#f97373]"}`} />
            {entry.name}: {entry.value}
          </span>
        ))}
      </div>
    </div>
  );
}
