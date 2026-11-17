import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AdvancedAnalyticsCharts } from "@/components/analytics/advanced-analytics-charts";
import { MetricCard, RecentAnalyticsMatches, RecentForm, StreakCards } from "@/components/analytics/analytics-panels";
import { Card } from "@/components/ui/card";
import { requireUser } from "@/lib/session";
import { getPlayerAnalytics } from "@/lib/services/analytics";

export const instant = false;

export default async function PublicPlayerPage({ params }: { params: Promise<{ playerId: string }> }) {
  const { playerId } = await params;
  const [session, data] = await Promise.all([
    requireUser().catch(() => null),
    getPlayerAnalytics(playerId, null, "all"),
  ]);
  if (!data) notFound();
  const totals = data.totals;
  const compareHref = session ? `/compare?playerB=${encodeURIComponent(playerId)}` : "/login";

  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/" className="text-lg font-semibold text-slate-950">Table Tennis Analytics</Link>
        <div className="flex gap-2"><Link href="/leaderboard" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium">Leaderboard</Link><Link href={session ? "/dashboard" : "/login"} className="rounded-full bg-[#0B82FF] px-4 py-2 text-sm font-medium text-white">{session ? "Dashboard" : "Sign in"}</Link></div>
      </header>
      <Card className="mb-5 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-7">
        {data.player.image ? <Image src={data.player.image} alt={`${data.player.name} profile`} width={96} height={96} unoptimized className="h-24 w-24 rounded-full border border-slate-200 object-cover" /> : <div aria-label={`${data.player.name} avatar`} role="img" className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-3xl font-semibold text-blue-700">{data.player.name.slice(0, 1).toUpperCase()}</div>}
        <div className="min-w-0 flex-1"><p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Public player profile</p><h1 className="mt-1 text-3xl font-semibold">{data.player.name}</h1><p className="mt-1 text-sm text-slate-500">{[data.player.level?.toLowerCase(), data.player.clubName, [data.player.city, data.player.country].filter(Boolean).join(", ")].filter(Boolean).join(" · ") || "Table tennis player"}</p>{data.player.bio && <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">{data.player.bio}</p>}</div>
        <Link href={compareHref} className="rounded-full bg-[#0B82FF] px-4 py-2.5 text-center text-sm font-medium text-white hover:bg-blue-700">Compare players</Link>
      </Card>
      <section aria-label="Player statistics" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard label="Completed matches" value={totals.played} />
        <MetricCard label="Matches won" value={totals.won} />
        <MetricCard label="Win percentage" value={`${totals.winPercentage}%`} />
        <MetricCard label="Games won" value={totals.gamesWon} />
      </section>
      <div className="mt-5"><StreakCards currentWins={totals.currentWinningStreak} currentLosses={totals.currentLosingStreak} bestWins={totals.longestWinningStreak} bestLosses={totals.longestLosingStreak} /></div>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><RecentForm results={totals.recent5} label="Last 5 completed matches" /><RecentForm results={totals.recent10} label="Last 10 completed matches" /></div>
      <AdvancedAnalyticsCharts buckets={data.buckets} wins={totals.won} losses={totals.lost} />
      <div className="mt-6"><RecentAnalyticsMatches matches={data.recentMatches} linkMatchDetails={false} /></div>
    </div>
  </main>;
}
