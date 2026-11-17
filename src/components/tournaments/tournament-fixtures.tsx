import Link from "next/link";

import { FixtureScheduleForm } from "@/components/tournaments/fixture-schedule-form";

type Fixture = {
  id: string;
  position: number;
  status: string;
  scheduledAt: string | null;
  winnerId: string | null;
  player1: { id: string; name: string } | null;
  player2: { id: string; name: string } | null;
  match: { id: string; status: string; player1GamesWon: number; player2GamesWon: number; scheduledAt: string } | null;
};
type Round = { id: string; number: number; label: string; status: string; fixtures: Fixture[] };

const fixtureStatus: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700",
  SCHEDULED: "bg-slate-100 text-slate-700",
  PENDING: "bg-slate-100 text-slate-500",
  BYE: "bg-slate-100 text-slate-500",
  FORFEIT: "bg-amber-50 text-amber-700",
  CANCELLED: "bg-red-50 text-red-700",
};

const when = (value: string | null) => value ? new Intl.DateTimeFormat("en", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Time to be confirmed";

function FixtureCard({ fixture, tournamentId, canSchedule }: { fixture: Fixture; tournamentId: string; canSchedule: boolean }) {
  const player = (slot: Fixture["player1"], other: Fixture["player2"]) => slot?.name ?? (fixture.status === "BYE" && other ? "Bye" : "TBD");
  const schedulable = canSchedule && fixture.player1 && fixture.player2 && ["PENDING", "SCHEDULED"].includes(fixture.status) && (!fixture.match || ["SCHEDULED", "ABANDONED", "CANCELLED"].includes(fixture.match.status));
  return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0 space-y-1 text-sm">
        <p className={`truncate ${fixture.winnerId && fixture.winnerId === fixture.player1?.id ? "font-semibold text-slate-900" : "text-slate-700"}`}>{player(fixture.player1, fixture.player2)}{fixture.match && fixture.match.status !== "SCHEDULED" ? <span className="ml-2 text-slate-500">{fixture.match.player1GamesWon}</span> : null}</p>
        <p className={`truncate ${fixture.winnerId && fixture.winnerId === fixture.player2?.id ? "font-semibold text-slate-900" : "text-slate-700"}`}>{player(fixture.player2, fixture.player1)}{fixture.match && fixture.match.status !== "SCHEDULED" ? <span className="ml-2 text-slate-500">{fixture.match.player2GamesWon}</span> : null}</p>
      </div>
      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${fixtureStatus[fixture.status] ?? "bg-slate-100"}`}>{fixture.status.replaceAll("_", " ").toLowerCase()}</span>
    </div>
    {fixture.status !== "BYE" && <p className="mt-2 text-xs text-slate-500">{when(fixture.match?.scheduledAt ?? fixture.scheduledAt)}{fixture.match && <> · <Link className="text-blue-600 hover:underline" href={`/matches/${fixture.match.id}`}>{fixture.match.status === "IN_PROGRESS" ? "Live match" : "Open match"}</Link></>}</p>}
    {schedulable && <FixtureScheduleForm tournamentId={tournamentId} fixtureId={fixture.id} scheduledAt={fixture.match?.scheduledAt ?? fixture.scheduledAt} />}
  </div>;
}

export function TournamentFixtures({ rounds, format, tournamentId, canSchedule }: { rounds: Round[]; format: string; tournamentId: string; canSchedule: boolean }) {
  if (!rounds.length) return <p className="mt-3 text-sm text-slate-500">Fixtures will appear after the organizer closes registration and generates the draw.</p>;
  if (format === "SINGLE_ELIMINATION") {
    return <div className="mt-4 overflow-x-auto pb-2">
      <div className="flex min-w-max gap-4">
        {rounds.map((round) => <section key={round.id} aria-label={round.label} className="w-64 shrink-0">
          <h3 className="mb-2 text-sm font-semibold text-slate-600">{round.label}</h3>
          <div className="flex h-full flex-col justify-around gap-3">{round.fixtures.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} tournamentId={tournamentId} canSchedule={canSchedule} />)}</div>
        </section>)}
      </div>
    </div>;
  }
  return <div className="mt-4 space-y-5">{rounds.map((round) => <section key={round.id}>
    <h3 className="mb-2 text-sm font-semibold text-slate-600">{round.label}</h3>
    <div className="grid gap-2 md:grid-cols-2">{round.fixtures.map((fixture) => <FixtureCard key={fixture.id} fixture={fixture} tournamentId={tournamentId} canSchedule={canSchedule} />)}</div>
  </section>)}</div>;
}
