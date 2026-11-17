import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionDialog } from "@/components/admin/action-dialog";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, Panel, StatusBadge, formatDate, label } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getTournamentAdminDetail } from "@/lib/services/admin/tournaments";

export const instant = false;

export default async function AdminTournamentDetailPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const admin = await requireSuperAdmin();
  const { tournamentId } = await params;
  const tournament = await getTournamentAdminDetail(tournamentId);
  if (!tournament) notFound();
  const endpoint = `/api/admin/tournaments/${tournament.id}`;
  return <AdminShell adminName={admin.name}>
    <Link href="/admin/tournaments" className="text-sm text-slate-500 hover:text-slate-900">← Tournaments</Link>
    <div className="mt-3"><AdminHeader title={tournament.name} description={`${tournament.format === "ROUND_ROBIN" ? "Round robin" : "Single elimination"} · ${formatDate(tournament.startDate, false)} – ${formatDate(tournament.endDate, false)} · organized by ${tournament.createdBy.name}`} action={<StatusBadge value={tournament.status} />} /></div>
    <div className="mb-6 flex flex-wrap gap-2">
      <ActionDialog label="Correct details" title="Correct tournament details" description="Descriptive corrections do not affect fixtures or progression and are recorded in the audit log." endpoint={endpoint} payload={{ action: "update" }} fields={[
        { name: "name", label: "Name", required: true, defaultValue: tournament.name },
        { name: "location", label: "Location", defaultValue: tournament.location ?? "" },
        { name: "description", label: "Description", type: "textarea", defaultValue: tournament.description ?? "" },
        { name: "rules", label: "Rules", type: "textarea", defaultValue: tournament.rules ?? "" },
        { name: "reason", label: "Reason", type: "textarea", required: true },
      ]} />
      {!["COMPLETED", "CANCELLED"].includes(tournament.status) && <ActionDialog label="Cancel tournament" title="Cancel tournament" description="All unfinished matches are abandoned and participants are notified. This cannot be undone." endpoint={endpoint} payload={{ action: "cancel" }} tone="danger" confirmLabel="Cancel tournament" />}
      <Link href={`/tournaments/${tournament.id}`} className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm">Public page</Link>
    </div>
    {tournament.winner && <p className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm">Champion: <span className="font-semibold">{tournament.winner.name}</span>{tournament.runnerUp && <> · Runner-up: {tournament.runnerUp.name}</>}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <Panel title="Fixtures & results">
        <p className="mb-3 text-xs text-slate-500">To correct a tournament result, open the match and use the result correction tool. Standings and bracket progression are updated safely.</p>
        {tournament.rounds.length ? <div className="space-y-4">{tournament.rounds.map((round) => <section key={round.id}><h3 className="mb-2 text-sm font-semibold text-slate-600">{round.label}</h3><ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">{round.fixtures.map((fixture) => <li key={fixture.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"><span>{fixture.player1?.name ?? "TBD"} vs {fixture.player2?.name ?? (fixture.status === "BYE" ? "Bye" : "TBD")}{fixture.match && <span className="text-slate-500"> · {fixture.match.player1GamesWon}–{fixture.match.player2GamesWon}</span>}</span><span className="flex items-center gap-2"><StatusBadge value={fixture.status} />{fixture.match && <Link href={`/admin/matches/${fixture.match.id}`} className="text-xs text-blue-700">Match</Link>}</span></li>)}</ul></section>)}</div> : <p className="text-sm text-slate-500">No fixtures generated.</p>}
      </Panel>
      <div className="space-y-5">
        <Panel title={`Participants (${tournament.participants.length})`}>{tournament.participants.length ? <ul className="divide-y divide-slate-100">{tournament.participants.map((participant) => <li key={participant.id} className="py-2 text-sm"><div className="flex items-center justify-between gap-2"><Link href={`/admin/players/${participant.user.id}`} className="truncate hover:text-blue-700">{participant.user.name}</Link><StatusBadge value={participant.status} /></div>{participant.removedReason && <p className="text-xs text-slate-500">{participant.removedReason}</p>}</li>)}</ul> : <p className="text-sm text-slate-500">No registrations.</p>}</Panel>
        <Panel title="Reports">{tournament.reports.length ? <ul className="divide-y divide-slate-100">{tournament.reports.map((report) => <li key={report.id} className="flex items-center justify-between py-2 text-sm"><Link href={`/admin/reports/${report.id}`} className="hover:text-blue-700">{label(report.type)}</Link><StatusBadge value={report.status} /></li>)}</ul> : <p className="text-sm text-slate-500">No reports.</p>}</Panel>
      </div>
    </div>
  </AdminShell>;
}
