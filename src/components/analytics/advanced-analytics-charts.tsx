"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Card } from "@/components/ui/card";
import type { ReactNode } from "react";
import type { PerformanceBucket } from "@/lib/analytics/calculations";

const tooltipStyle = { borderRadius: "12px", border: "1px solid #e2e8f0", boxShadow: "0 8px 24px rgba(15, 23, 42, 0.08)" };

function ChartCard({ title, children }: { title: string; children: ReactNode }) {
  return <Card><h2 className="mb-5 font-semibold text-slate-900">{title}</h2>{children}</Card>;
}

function EmptyChart() {
  return <div className="flex h-60 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 text-center text-sm text-slate-500">Complete matches in this timeframe to see your chart.</div>;
}

export function AdvancedAnalyticsCharts({
  buckets,
  wins,
  losses,
}: {
  buckets: PerformanceBucket[];
  wins: number;
  losses: number;
}) {
  const totals = [{ name: "Wins", value: wins }, { name: "Losses", value: losses }].filter((entry) => entry.value > 0);
  const hasBuckets = buckets.length > 0;
  return (
    <section aria-label="Advanced performance charts" className="mt-6 grid gap-5 xl:grid-cols-2">
      <ChartCard title="Win and loss analytics">
        {hasBuckets ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Bar dataKey="wins" name="Won" stackId="matches" fill="#0B82FF" radius={[4, 4, 0, 0]} /><Bar dataKey="losses" name="Lost" stackId="matches" fill="#f97373" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div> : <EmptyChart />}
      </ChartCard>
      <ChartCard title="Win rate over time">
        {hasBuckets ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><LineChart data={buckets} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis domain={[0, 100]} tickFormatter={(value: number) => `${value}%`} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip formatter={(value) => [`${value}%`, "Win rate"]} contentStyle={tooltipStyle} /><Legend /><Line type="monotone" dataKey="winRate" name="Win rate" stroke="#0B82FF" strokeWidth={2.5} dot={{ r: 3 }} />
        </LineChart></ResponsiveContainer></div> : <EmptyChart />}
      </ChartCard>
      <ChartCard title="Points scored and conceded">
        {hasBuckets ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Bar dataKey="pointsScored" name="Scored" fill="#0B82FF" radius={[4, 4, 0, 0]} /><Bar dataKey="pointsConceded" name="Conceded" fill="#f97373" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div> : <EmptyChart />}
      </ChartCard>
      <ChartCard title="Games won and lost">
        {hasBuckets ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Bar dataKey="gamesWon" name="Won" fill="#0B82FF" radius={[4, 4, 0, 0]} /><Bar dataKey="gamesLost" name="Lost" fill="#f97373" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div> : <EmptyChart />}
      </ChartCard>
      <ChartCard title="Matches played by period">
        {hasBuckets ? <div className="h-64 w-full"><ResponsiveContainer width="100%" height="100%"><BarChart data={buckets} margin={{ top: 8, right: 10, left: -18, bottom: 4 }}>
          <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} /><XAxis dataKey="period" tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 11 }} /><YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fill: "#64748b", fontSize: 12 }} /><Tooltip contentStyle={tooltipStyle} /><Legend /><Bar dataKey="matches" name="Matches" fill="#0B82FF" radius={[4, 4, 0, 0]} />
        </BarChart></ResponsiveContainer></div> : <EmptyChart />}
      </ChartCard>
      <ChartCard title="Win / loss share">
        {totals.length ? <div className="relative h-64 w-full"><ResponsiveContainer width="100%" height="100%"><PieChart><Pie data={totals} dataKey="value" nameKey="name" innerRadius={66} outerRadius={94} paddingAngle={3}>
          {totals.map((entry) => <Cell key={entry.name} fill={entry.name === "Wins" ? "#0B82FF" : "#f97373"} />)}
        </Pie><Tooltip contentStyle={tooltipStyle} /></PieChart></ResponsiveContainer><div className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm font-medium text-slate-600">{wins + losses} matches</div><div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-5 text-xs text-slate-600">{totals.map((entry) => <span key={entry.name} className="inline-flex items-center gap-1.5"><span className={`h-2 w-2 rounded-full ${entry.name === "Wins" ? "bg-[#0B82FF]" : "bg-[#f97373]"}`} />{entry.name}: {entry.value}</span>)}</div></div> : <EmptyChart />}
      </ChartCard>
    </section>
  );
}
