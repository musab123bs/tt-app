import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { RegistrationManager } from "@/components/tournaments/registration-manager";
import { TournamentActions } from "@/components/tournaments/tournament-actions";
import { TournamentFixtures } from "@/components/tournaments/tournament-fixtures";
import { TournamentStandings } from "@/components/tournaments/tournament-standings";
import { TournamentStatusBadge } from "@/components/tournaments/tournament-status-badge";
import { isAdminRole } from "@/lib/roles";
import { getTournamentDetail } from "@/lib/services/tournaments";
import { requireUser } from "@/lib/session";

export const instant = false;

const date = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "To be scheduled";
const tieBreakLabels: Record<string, string> = {
  MATCH_WIN_PERCENTAGE: "match win percentage",
  HEAD_TO_HEAD: "head-to-head result",
  GAME_DIFFERENCE: "game difference",
  POINT_DIFFERENCE: "point difference",
};

export default async function TournamentDetailPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const session = await requireUser();
  const { tournamentId } = await params;
  const tournament = await getTournamentDetail(tournamentId, session.user.id, isAdminRole(session.user.role));
  if (!tournament) notFound();

  const mine = tournament.myRegistration?.status ?? null;
  const approved = tournament.participants.filter((participant) => participant.status === "APPROVED");
  const active = tournament.participants.filter((participant) => participant.status === "APPROVED" || participant.status === "PENDING");
  const deadlineOpen = new Date(tournament.registrationDeadline) > new Date();
  const canRegister = tournament.status === "OPEN_REGISTRATION" && !mine && deadlineOpen && active.length < tournament.maxParticipants && !tournament.isOrganizer;
  const canWithdraw = Boolean(mine && ["APPROVED", "PENDING"].includes(mine) && !tournament.drawGeneratedAt && tournament.status === "OPEN_REGISTRATION" && deadlineOpen);
  const finished = ["COMPLETED", "CANCELLED"].includes(tournament.status);
  const liveCount = tournament.rounds.flatMap((round) => round.fixtures).filter((fixture) => fixture.match?.status === "IN_PROGRESS").length;

  return <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}><main className="p-4 sm:p-6 lg:p-8">
    <Link href="/tournaments" className="text-sm text-slate-500 hover:text-slate-900">← All tournaments</Link>
    <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {tournament.bannerImage && <img src={tournament.bannerImage} alt="" className="h-52 w-full object-cover sm:h-64" />}
      <div className="p-5 sm:p-7">
        <PageHeader title={tournament.name} description={tournament.description || `Organized by ${tournament.organizerName}`} action={<TournamentStatusBadge status={tournament.status} />} />
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Location", tournament.location || "To be announced"],
            ["Dates", `${date(tournament.startDate)} – ${date(tournament.endDate)}`],
            ["Registration deadline", date(tournament.registrationDeadline)],
            ["Format", `${tournament.format === "ROUND_ROBIN" ? "Round robin" : "Single elimination"} · Best of ${tournament.bestOf}`],
            ["Players", `${approved.length} / ${tournament.maxParticipants} (min ${tournament.minParticipants})`],
            ["Organizer", tournament.organizerName],
            ["Registration", tournament.registrationRequiresApproval ? "Organizer approval required" : "Instant confirmation"],
            ["Live matches", liveCount ? `${liveCount} in progress` : "None right now"],
          ].map(([label, value]) => <div key={label} className="rounded-xl bg-slate-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-0.5 font-medium text-slate-800">{value}</dd></div>)}
        </dl>
        <div className="mt-5"><TournamentActions tournamentId={tournament.id} status={tournament.status} mine={mine} isOrganizer={tournament.isOrganizer} canRegister={canRegister} canWithdraw={canWithdraw} hasDraw={Boolean(tournament.drawGeneratedAt)} canDelete={tournament.status === "DRAFT" && tournament.participants.length === 0} /></div>
      </div>
    </div>

    {tournament.winner && <section className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-xs font-medium uppercase tracking-wide text-amber-700">Final result</p><h2 className="mt-1 text-lg font-semibold">Champion: {tournament.winner.name}</h2>{tournament.runnerUp && <p className="mt-1 text-sm text-slate-600">Runner-up: {tournament.runnerUp.name}</p>}</section>}

    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
      <section className="min-w-0 space-y-5">
        {tournament.format === "ROUND_ROBIN" && tournament.drawGeneratedAt && <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">Standings</h2>
          <TournamentStandings standings={tournament.standings} />
          <p className="mt-2 text-xs text-slate-500">Ties are broken by {tournament.tieBreakOrder.map((rule) => tieBreakLabels[rule]).join(", then ")}.</p>
        </div>}
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="text-lg font-semibold">{tournament.format === "SINGLE_ELIMINATION" ? "Bracket" : "Fixtures and results"}</h2>
          <TournamentFixtures rounds={tournament.rounds} format={tournament.format} tournamentId={tournament.id} canSchedule={tournament.isOrganizer && !finished} />
        </div>
        <p className="text-sm text-slate-500">Problem with this tournament? <Link href={`/reports?type=TOURNAMENT_DISPUTE&tournamentId=${tournament.id}`} className="text-blue-700 hover:underline">Report a dispute</Link></p>
        {tournament.rules && <div className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">Rules</h2><p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{tournament.rules}</p></div>}
      </section>
      <aside className="space-y-5">
        {tournament.isOrganizer ? <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Registrations ({tournament.participants.length})</h2>
          <RegistrationManager tournamentId={tournament.id} participants={tournament.participants} drawGenerated={Boolean(tournament.drawGeneratedAt)} finished={finished} />
        </div> : <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="font-semibold">Players ({approved.length})</h2>
          {approved.length ? <ul className="mt-3 divide-y divide-slate-100">{approved.map((participant) => <li key={participant.id} className="flex items-center justify-between gap-2 py-2.5"><Link href={`/players/${participant.userId}`} className="truncate text-sm hover:text-blue-700">{participant.name}</Link>{participant.seed ? <span className="text-xs text-slate-400">Seed {participant.seed}</span> : null}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">No confirmed players yet.</p>}
        </div>}
      </aside>
    </div>
  </main></DashboardShell>;
}
