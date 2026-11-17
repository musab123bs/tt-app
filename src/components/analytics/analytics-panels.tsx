import Image from "next/image";
import Link from "next/link";

import { Card } from "@/components/ui/card";
import { ANALYTICS_TIMEFRAMES, type AnalyticsTimeframe } from "@/lib/analytics/calculations";

const timeframeLabels: Record<AnalyticsTimeframe, string> = {
  "7d": "Last 7 days", "30d": "Last 30 days", "3m": "Last 3 months",
  "6m": "Last 6 months", "12m": "Last 12 months", all: "All time",
};

export function AnalyticsTimeframeFilter({ selected, basePath = "/analytics" }: { selected: AnalyticsTimeframe; basePath?: string }) {
  return <nav aria-label="Analytics timeframe" className="flex flex-wrap gap-2">{ANALYTICS_TIMEFRAMES.map((timeframe) => <Link
    key={timeframe}
    href={`${basePath}?timeframe=${timeframe}`}
    aria-current={selected === timeframe ? "page" : undefined}
    className={`rounded-full px-3 py-2 text-xs font-medium transition sm:px-4 sm:text-sm ${selected === timeframe ? "bg-[#0B82FF] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
  >{timeframeLabels[timeframe]}</Link>)}</nav>;
}

export function LeaderboardPeriodFilter({ selected }: { selected: "overall" | "weekly" | "monthly" | "yearly" }) {
  const labels = { overall: "Overall", weekly: "Weekly", monthly: "Monthly", yearly: "Yearly" } as const;
  return <nav aria-label="Leaderboard period" className="flex flex-wrap gap-2">{Object.entries(labels).map(([period, label]) => <Link
    key={period} href={`/leaderboard?period=${period}`} aria-current={selected === period ? "page" : undefined}
    className={`rounded-full px-4 py-2 text-sm font-medium ${selected === period ? "bg-[#0B82FF] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
  >{label}</Link>)}</nav>;
}

export function MetricCard({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return <Card><p className="text-sm text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold tabular-nums text-slate-950">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</Card>;
}

export function StreakCards({
  currentWins, currentLosses, bestWins, bestLosses,
}: { currentWins: number; currentLosses: number; bestWins: number; bestLosses: number }) {
  return <section aria-label="Match streaks" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
    <MetricCard label="Current winning streak" value={currentWins} />
    <MetricCard label="Current losing streak" value={currentLosses} />
    <MetricCard label="Longest winning streak" value={bestWins} />
    <MetricCard label="Longest losing streak" value={bestLosses} />
  </section>;
}

export function RecentForm({ results, label }: { results: Array<"W" | "L">; label: string }) {
  const wins = results.filter((result) => result === "W").length;
  const percentage = results.length ? Math.round((wins / results.length) * 100) : 0;
  return <Card>
    <div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold text-slate-900">{label}</h2><p className="mt-1 text-sm text-slate-500">{wins} wins / {results.length - wins} losses · {percentage}% wins</p></div><p className="text-xl font-semibold text-slate-900">{percentage}%</p></div>
    <div className="mt-4 flex flex-wrap gap-2" aria-label={`${label} results`}>
      {results.length ? results.map((result, index) => <span key={`${result}-${index}`} title={result === "W" ? "Win" : "Loss"} className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${result === "W" ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"}`}>{result}</span>) : <span className="text-sm text-slate-500">No completed matches yet.</span>}
    </div>
  </Card>;
}

export type AnalyticsRecentMatch = {
  id: string; opponentName: string; opponentImage: string | null; completedAt: string;
  result: "Win" | "Loss"; score: string; format: string;
};

export function RecentAnalyticsMatches({ matches, linkMatchDetails = true }: { matches: AnalyticsRecentMatch[]; linkMatchDetails?: boolean }) {
  return <Card>
    <div className="mb-4 flex items-center justify-between gap-3"><h2 className="font-semibold text-slate-900">Recent completed matches</h2><Link href="/matches" className="text-sm font-medium text-blue-700 hover:text-blue-800">Full history</Link></div>
    {matches.length ? <ul className="divide-y divide-slate-100">{matches.map((match) => <li key={match.id}>
      {linkMatchDetails ? <Link href={`/matches/${match.id}`} className="flex items-center gap-3 py-3 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B82FF]">
        <Avatar name={match.opponentName} image={match.opponentImage} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">vs {match.opponentName}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(match.completedAt)} · {match.format}</p></div>
        <div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${match.result === "Win" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{match.result}</span><p className="mt-1 text-xs tabular-nums text-slate-600">{match.score}</p></div>
      </Link> : <div className="flex items-center gap-3 py-3">
        <Avatar name={match.opponentName} image={match.opponentImage} />
        <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-slate-900">vs {match.opponentName}</p><p className="mt-0.5 text-xs text-slate-500">{formatDate(match.completedAt)} · {match.format}</p></div>
        <div className="text-right"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${match.result === "Win" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{match.result}</span><p className="mt-1 text-xs tabular-nums text-slate-600">{match.score}</p></div>
      </div>}
    </li>)}</ul> : <p className="py-8 text-center text-sm text-slate-500">No completed matches yet.</p>}
  </Card>;
}

export function Avatar({ name, image, size = 44 }: { name: string; image: string | null; size?: number }) {
  return image ? <Image src={image} alt={`${name} profile`} width={size} height={size} unoptimized className="shrink-0 rounded-full border border-slate-200 object-cover" style={{ width: size, height: size }} /> : <span role="img" aria-label={`${name} avatar`} className="flex shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700" style={{ width: size, height: size }}>{name.trim().slice(0, 1).toUpperCase() || "P"}</span>;
}

export function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Karachi" }).format(new Date(value));
}
