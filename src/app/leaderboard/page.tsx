import Image from "next/image";
import Link from "next/link";

import { LeaderboardPeriodFilter } from "@/components/analytics/analytics-panels";
import { Card } from "@/components/ui/card";
import { getPlayerLeaderboard } from "@/lib/services/analytics";
import type { LeaderboardPeriod } from "@/lib/analytics/calculations";

export const instant = false;

const periods: LeaderboardPeriod[] = ["overall", "weekly", "monthly", "yearly"];
const pageSize = 50;

export default async function LeaderboardPage({ searchParams }: { searchParams: Promise<{ period?: string; page?: string }> }) {
  const query = await searchParams;
  const period = periods.includes(query.period as LeaderboardPeriod) ? query.period as LeaderboardPeriod : "overall";
  const data = await getPlayerLeaderboard(period);
  const page = Math.max(1, Number.parseInt(query.page ?? "1", 10) || 1);
  const pageCount = Math.max(1, Math.ceil(data.players.length / pageSize));
  const currentPage = Math.min(page, pageCount);
  const rows = data.players.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return <main className="min-h-screen bg-slate-100 px-4 py-6 text-slate-900 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3"><Link href="/" className="text-lg font-semibold text-slate-950">Table Tennis Analytics</Link><Link href="/dashboard" className="rounded-full bg-[#0B82FF] px-4 py-2 text-sm font-medium text-white">Dashboard</Link></header>
      <div className="mb-5"><p className="text-sm font-medium uppercase tracking-[0.18em] text-blue-700">Platform rankings</p><h1 className="mt-1 text-3xl font-semibold">Player leaderboard</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Ranked by win percentage, then matches won, head-to-head record, and player ID. This is a platform ranking, not an official ITTF ranking. Players need at least {data.minimumMatches} completed matches in the selected period to be eligible.</p></div>
      <div className="mb-4"><LeaderboardPeriodFilter selected={period} /></div>
      <Card className="overflow-hidden p-0">
        {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="px-4 py-3">Rank</th><th scope="col" className="px-4 py-3">Player</th><th scope="col" className="px-4 py-3 text-right">Played</th><th scope="col" className="px-4 py-3 text-right">Won</th><th scope="col" className="px-4 py-3 text-right">Win %</th><th scope="col" className="px-4 py-3 text-right">Games won</th></tr></thead><tbody className="divide-y divide-slate-100">{rows.map((player) => <tr key={player.id} className="hover:bg-slate-50"><td className="px-4 py-3 font-semibold tabular-nums text-slate-600">{player.eligible ? `#${player.rank}` : "—"}</td><td className="px-4 py-3"><Link href={`/players/${player.id}`} className="flex items-center gap-3 font-medium text-slate-900 hover:text-blue-700">{player.image ? <Image src={player.image} alt="" width={40} height={40} unoptimized className="h-10 w-10 rounded-full object-cover" /> : <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700">{player.name.slice(0, 1).toUpperCase()}</span>}<span>{player.name}{!player.eligible && <span className="ml-2 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-medium text-slate-500">Needs {data.minimumMatches - player.played} more</span>}</span></Link></td><td className="px-4 py-3 text-right tabular-nums">{player.played}</td><td className="px-4 py-3 text-right tabular-nums">{player.won}</td><td className="px-4 py-3 text-right tabular-nums">{player.winPercentage.toFixed(1)}%</td><td className="px-4 py-3 text-right tabular-nums">{player.gamesWon}</td></tr>)}</tbody></table></div> : <div className="px-5 py-14 text-center"><h2 className="font-semibold text-slate-900">No public player records yet</h2><p className="mt-1 text-sm text-slate-500">Completed match records will appear here.</p></div>}
        {pageCount > 1 && <nav aria-label="Leaderboard pages" className="flex items-center justify-between border-t border-slate-100 px-4 py-3"><span className="text-sm text-slate-500">Page {currentPage} of {pageCount}</span><div className="flex gap-2"><PageLink period={period} page={currentPage - 1} disabled={currentPage <= 1}>Previous</PageLink><PageLink period={period} page={currentPage + 1} disabled={currentPage >= pageCount}>Next</PageLink></div></nav>}
      </Card>
    </div>
  </main>;
}

function PageLink({ period, page, disabled, children }: { period: string; page: number; disabled: boolean; children: React.ReactNode }) {
  const className = "rounded-full border border-slate-200 px-3 py-1.5 text-sm font-medium";
  return disabled ? <span aria-disabled="true" className={`${className} cursor-not-allowed text-slate-300`}>{children}</span> : <Link href={`/leaderboard?period=${period}&page=${page}`} className={`${className} text-slate-700 hover:bg-slate-50`}>{children}</Link>;
}
