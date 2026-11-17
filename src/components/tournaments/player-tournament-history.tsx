import Link from "next/link";

import type { PlayerTournamentHistory } from "@/lib/services/tournament-history";

export function PlayerTournamentHistorySection({ history }: { history: PlayerTournamentHistory }) {
  const { summary } = history;
  return <section aria-labelledby="tournament-history" className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 sm:p-6">
    <h2 id="tournament-history" className="text-lg font-semibold">Tournament history</h2>
    <div className="mt-4 grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {[["Tournaments", summary.tournamentsPlayed], ["Titles", summary.titles], ["Runner-up", summary.runnerUps], ["Matches won", summary.matchesWon], ["Matches lost", summary.matchesLost], ["Win rate", `${summary.winPercentage}%`]].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-xl font-semibold">{value}</p></div>)}
    </div>
    {history.tournaments.length ? <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div><h3 className="text-sm font-semibold text-slate-600">Tournaments</h3><ul className="mt-2 divide-y divide-slate-100">{history.tournaments.slice(0, 10).map((row) => <li key={row.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><Link href={`/tournaments/${row.id}`} className="truncate font-medium hover:text-blue-700">{row.name}</Link><span className="shrink-0 text-slate-500">{row.result} · {row.won}–{row.lost}</span></li>)}</ul></div>
      <div><h3 className="text-sm font-semibold text-slate-600">Recent tournament matches</h3>{history.recentMatches.length ? <ul className="mt-2 divide-y divide-slate-100">{history.recentMatches.map((match) => <li key={match.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><span className="min-w-0 truncate">vs {match.opponentName} <span className="text-slate-400">· {match.round}, {match.tournamentName}</span></span><span className={`shrink-0 font-medium ${match.won ? "text-emerald-700" : "text-red-600"}`}>{match.won ? "W" : "L"} {match.score}</span></li>)}</ul> : <p className="mt-2 text-sm text-slate-500">No completed tournament matches yet.</p>}</div>
    </div> : <p className="mt-4 text-sm text-slate-500">No tournament entries yet.</p>}
  </section>;
}
