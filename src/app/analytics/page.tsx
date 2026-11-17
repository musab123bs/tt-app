import { Suspense } from "react";
import Link from "next/link";

import { AdvancedAnalyticsCharts } from "@/components/analytics/advanced-analytics-charts";
import { AnalyticsTimeframeFilter, MetricCard, RecentAnalyticsMatches, RecentForm, StreakCards } from "@/components/analytics/analytics-panels";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { ANALYTICS_TIMEFRAMES, type AnalyticsTimeframe } from "@/lib/analytics/calculations";
import { requireUser } from "@/lib/session";
import { getPlayerAnalytics } from "@/lib/services/analytics";

export default function AnalyticsPage({ searchParams }: { searchParams: Promise<{ timeframe?: string }> }) {
  return <Suspense fallback={<AnalyticsSkeleton />}><AnalyticsContent searchParams={searchParams} /></Suspense>;
}

async function AnalyticsContent({ searchParams }: { searchParams: Promise<{ timeframe?: string }> }) {
  const [session, query] = await Promise.all([requireUser(), searchParams]);
  const timeframe: AnalyticsTimeframe = ANALYTICS_TIMEFRAMES.includes(query.timeframe as AnalyticsTimeframe)
    ? query.timeframe as AnalyticsTimeframe
    : "all";
  const data = await getPlayerAnalytics(session.user.id, session.user.id, timeframe);
  if (!data) return null;
  const totals = data.totals;
  const range = data.timeframeTotals;

  return <DashboardShell playerName={data.player.name} playerImage={data.player.image}>
    <div className="p-4 sm:p-6 lg:p-8">
      <PageHeader title="Performance analytics" description="Match results and table tennis performance calculated from your completed records." action={<Link href="/compare" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Compare players</Link>} />
      <div className="mt-6"><AnalyticsTimeframeFilter selected={timeframe} /></div>
      <section aria-label="Overall statistics" className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Matches played" value={totals.played} />
        <MetricCard label="Matches won" value={totals.won} />
        <MetricCard label="Matches lost" value={totals.lost} />
        <MetricCard label="Win / loss rate" value={`${totals.winPercentage}% / ${totals.lossPercentage}%`} />
        <MetricCard label="Games won / lost" value={`${totals.gamesWon} / ${totals.gamesLost}`} />
        <MetricCard label="Points scored / conceded" value={`${totals.pointsScored} / ${totals.pointsConceded}`} />
        <MetricCard label="Wins in selected period" value={range.won} />
        <MetricCard label="Losses in selected period" value={range.lost} />
      </section>
      <div className="mt-5"><StreakCards currentWins={totals.currentWinningStreak} currentLosses={totals.currentLosingStreak} bestWins={totals.longestWinningStreak} bestLosses={totals.longestLosingStreak} /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2">
        <RecentForm results={totals.recent5} label="Last 5 completed matches" />
        <RecentForm results={totals.recent10} label="Last 10 completed matches" />
      </div>
      <AdvancedAnalyticsCharts buckets={data.buckets} wins={range.won} losses={range.lost} />
      <div className="mt-6"><RecentAnalyticsMatches matches={data.recentMatches} /></div>
    </div>
  </DashboardShell>;
}

function AnalyticsSkeleton() {
  return <main className="min-h-screen bg-slate-100 p-4 sm:p-8"><div className="mx-auto max-w-7xl animate-pulse"><div className="h-10 w-72 rounded bg-slate-200" /><div className="mt-6 grid grid-cols-2 gap-3 xl:grid-cols-4">{Array.from({ length: 8 }, (_, i) => <div key={i} className="h-28 rounded-2xl bg-white" />)}</div><div className="mt-5 grid gap-5 xl:grid-cols-2">{Array.from({ length: 4 }, (_, i) => <div key={i} className="h-80 rounded-2xl bg-white" />)}</div></div></main>;
}
