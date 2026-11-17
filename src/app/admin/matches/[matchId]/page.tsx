import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionDialog } from "@/components/admin/action-dialog";
import { AdminShell } from "@/components/admin/admin-shell";
import { MatchCorrectionForm } from "@/components/admin/match-correction-form";
import { AdminHeader, Panel, StatusBadge, formatDate, label } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getMatchAdminDetail } from "@/lib/services/admin/matches";

export const instant = false;
const name = (player: { name: string; playerProfile: { fullName: string } | null }) => player.playerProfile?.fullName || player.name;
type Snapshot = { winnerId: string | null; player1GamesWon: number; player2GamesWon: number; games: Array<{ number: number; player1Score: number; player2Score: number }> };
const describe = (value: unknown) => { const snap = value as Snapshot; return `${snap.player1GamesWon}–${snap.player2GamesWon} (${snap.games.map((game) => `${game.player1Score}-${game.player2Score}`).join(", ")})`; };

export default async function AdminMatchDetailPage({ params }: { params: Promise<{ matchId: string }> }) {
  const admin = await requireSuperAdmin();
  const { matchId } = await params;
  const match = await getMatchAdminDetail(matchId);
  if (!match) notFound();
  const endpoint = `/api/admin/matches/${match.id}`;
  const p1 = name(match.player1); const p2 = name(match.player2);
  const winner = match.winnerId === match.player1Id ? p1 : match.winnerId === match.player2Id ? p2 : null;
  return <AdminShell adminName={admin.name}>
    <Link href="/admin/matches" className="text-sm text-slate-500 hover:text-slate-900">← Matches</Link>
    <div className="mt-3"><AdminHeader title={`${p1} vs ${p2}`} description={`Best of ${match.bestOf} · scheduled ${formatDate(match.scheduledAt)}${match.location ? ` · ${match.location}` : ""}`} action={<div className="flex gap-2"><StatusBadge value={match.status} />{match.reviewStatus === "UNDER_REVIEW" && <StatusBadge value="UNDER_REVIEW" />}</div>} /></div>
    <div className="mb-6 flex flex-wrap gap-2">
      {match.reviewStatus === "NONE" ? <ActionDialog label="Mark under review" title="Mark match under review" description="Flags the match for investigation. Players and statistics are not changed." endpoint={endpoint} payload={{ action: "review" }} /> : <ActionDialog label="Clear review" title="Clear review flag" description="Close the review without changing the result." endpoint={endpoint} payload={{ action: "clear_review" }} />}
      {match.status !== "CANCELLED" && <ActionDialog label="Cancel match" title="Cancel invalid match" description="Cancelled matches are excluded from statistics. The original data is kept in the audit log." endpoint={endpoint} payload={{ action: "cancel" }} tone="danger" confirmLabel="Cancel match" disabled={Boolean(match.tournamentFixture && match.status === "COMPLETED")} />}
      <Link href={`/matches/${match.id}`} className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm">Open scoreboard</Link>
    </div>
    {match.reviewReason && <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">Under review: {match.reviewReason}</p>}
    {match.cancellationReason && <p className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">Cancelled {formatDate(match.cancelledAt)}: {match.cancellationReason}</p>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Result & score history">
        <p className="text-sm">Games: <span className="font-semibold">{match.player1GamesWon}–{match.player2GamesWon}</span>{winner && <> · Winner: <span className="font-semibold">{winner}</span></>} · Points {match.player1TotalPoints}–{match.player2TotalPoints}</p>
        {match.games.length ? <table className="mt-3 text-sm"><thead><tr className="text-xs text-slate-500"><th className="pr-4 text-left font-medium">Game</th><th className="pr-4 text-left font-medium">{p1}</th><th className="pr-4 text-left font-medium">{p2}</th><th className="text-left font-medium">Recorded points</th></tr></thead><tbody>{match.games.map((game) => <tr key={game.id}><td className="pr-4">{game.number}</td><td className="pr-4">{game.player1Score}</td><td className="pr-4">{game.player2Score}</td><td>{game._count.points}</td></tr>)}</tbody></table> : <p className="mt-3 text-sm text-slate-500">No games recorded.</p>}
        {match.tournamentFixture && <p className="mt-4 text-sm">Tournament: <Link href={`/admin/tournaments/${match.tournamentFixture.tournament.id}`} className="text-blue-700">{match.tournamentFixture.tournament.name}</Link> · {match.tournamentFixture.round.label}</p>}
        <p className="mt-2 text-xs text-slate-500">Created by {name(match.createdBy)} · {formatDate(match.createdAt)}</p>
      </Panel>
      <Panel title="Correct result">{match.status === "COMPLETED" ? <MatchCorrectionForm matchId={match.id} bestOf={match.bestOf} player1={p1} player2={p2} games={match.games.map((game) => ({ player1Score: game.player1Score, player2Score: game.player2Score }))} /> : <p className="text-sm text-slate-500">Only completed matches can be corrected.</p>}</Panel>
      <Panel title="Correction history">{match.corrections.length ? <ul className="divide-y divide-slate-100">{match.corrections.map((correction) => <li key={correction.id} className="py-3 text-sm"><p className="font-medium">{correction.admin.name} <span className="font-normal text-slate-500">· {formatDate(correction.createdAt)}</span></p><p className="text-slate-600">{correction.reason}</p><p className="mt-1 text-xs text-slate-500">Original {describe(correction.previousResult)} → {describe(correction.newResult)}</p></li>)}</ul> : <p className="text-sm text-slate-500">The original result has not been corrected.</p>}</Panel>
      <Panel title="Related reports">{match.reports.length ? <ul className="divide-y divide-slate-100">{match.reports.map((report) => <li key={report.id} className="flex items-center justify-between py-2.5 text-sm"><Link href={`/admin/reports/${report.id}`} className="hover:text-blue-700">{label(report.type)} · {formatDate(report.createdAt, false)}</Link><StatusBadge value={report.status} /></li>)}</ul> : <p className="text-sm text-slate-500">No reports.</p>}</Panel>
    </div>
  </AdminShell>;
}
