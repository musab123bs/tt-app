import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TournamentStatusBadge } from "@/components/tournaments/tournament-status-badge";
import { getPlayerTournamentHistory } from "@/lib/services/tournament-history";
import { getTournaments } from "@/lib/services/tournaments";
import { requireUser } from "@/lib/session";

export const instant = false;

const views = [
  { id: "browse", label: "Browse" },
  { id: "registered", label: "My registrations" },
  { id: "created", label: "Created by me" },
  { id: "upcoming", label: "Upcoming" },
  { id: "ongoing", label: "Ongoing" },
  { id: "completed", label: "Completed" },
  { id: "results", label: "My results" },
] as const;
type View = (typeof views)[number]["id"];

const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
const emptyCopy: Record<View, string> = {
  browse: "Create an event or check back when organizers publish one.",
  registered: "Tournaments you register for will appear here.",
  created: "Tournaments you organize will appear here, including drafts.",
  upcoming: "No upcoming tournaments are open right now.",
  ongoing: "No tournaments are being played right now.",
  completed: "Completed tournaments and their winners will appear here.",
  results: "Your tournament results will appear here after you compete.",
};

export default async function TournamentsPage({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const session = await requireUser();
  const requested = (await searchParams).view;
  const view: View = views.some((item) => item.id === requested) ? requested as View : "browse";
  const userId = session.user.id;
  const [tournaments, history] = await Promise.all([
    getTournaments({ userId }),
    view === "results" ? getPlayerTournamentHistory(userId, userId) : Promise.resolve(null),
  ]);
  const now = new Date();
  const filtered = tournaments.filter((tournament) => {
    if (view === "registered") return tournament.myRegistrationStatus === "APPROVED" || tournament.myRegistrationStatus === "PENDING";
    if (view === "created") return tournament.createdById === userId;
    if (view === "upcoming") return ["OPEN_REGISTRATION", "REGISTRATION_CLOSED"].includes(tournament.status) && new Date(tournament.endDate) > now;
    if (view === "ongoing") return tournament.status === "IN_PROGRESS";
    if (view === "completed") return tournament.status === "COMPLETED";
    return tournament.status !== "DRAFT" || tournament.createdById === userId;
  });

  return <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}><main className="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Tournaments" description="Find competitions, follow results, and manage your events." action={<Link href="/tournaments/new" className="rounded-full bg-[#0B82FF] px-4 py-2.5 text-center text-sm font-medium text-white">Create tournament</Link>} />
    <nav aria-label="Tournament views" className="mt-5 flex gap-2 overflow-x-auto pb-1">
      {views.map((item) => <Link key={item.id} href={item.id === "browse" ? "/tournaments" : `/tournaments?view=${item.id}`} aria-current={view === item.id ? "page" : undefined} className={`whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm ${view === item.id ? "bg-slate-900 text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>{item.label}</Link>)}
    </nav>

    {view === "results" && history ? <section className="mt-6 space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {[["Tournaments played", history.summary.tournamentsPlayed], ["Titles", history.summary.titles], ["Runner-up", history.summary.runnerUps], ["Match record", `${history.summary.matchesWon}–${history.summary.matchesLost}`], ["Win rate", `${history.summary.winPercentage}%`]].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4"><p className="text-xs text-slate-500">{label}</p><p className="mt-1 text-2xl font-semibold">{value}</p></div>)}
      </div>
      {history.tournaments.length ? <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="border-b border-slate-200 text-xs uppercase text-slate-500"><tr><th className="px-4 py-3">Tournament</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Result</th><th className="px-4 py-3">W–L</th></tr></thead><tbody className="divide-y divide-slate-100">{history.tournaments.map((row) => <tr key={row.id}><td className="px-4 py-3"><Link href={`/tournaments/${row.id}`} className="font-medium hover:text-blue-700">{row.name}</Link></td><td className="px-4 py-3 text-slate-500">{date(row.startDate)}</td><td className="px-4 py-3">{row.result}</td><td className="px-4 py-3">{row.won}–{row.lost}</td></tr>)}</tbody></table></div>
        : <Empty text={emptyCopy.results} />}
    </section> : filtered.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{filtered.map((tournament) => <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {tournament.bannerImage ? <img src={tournament.bannerImage} alt="" className="h-40 w-full object-cover" /> : <div className="h-24 bg-slate-100" />}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-slate-900">{tournament.name}</h2><TournamentStatusBadge status={tournament.status} /></div>
        <p className="mt-2 text-sm text-slate-500">{tournament.location || "Location to be announced"} · {date(tournament.startDate)}</p>
        <p className="mt-3 text-sm text-slate-600">{tournament.participantCount} / {tournament.maxParticipants} players · {tournament.format === "ROUND_ROBIN" ? "Round robin" : "Single elimination"}</p>
        {tournament.status === "COMPLETED" && tournament.winnerName && <p className="mt-2 text-sm font-medium text-amber-700">Champion: {tournament.winnerName}</p>}
        {tournament.myRegistrationStatus && <p className="mt-2 text-xs text-slate-500">Your registration: {tournament.myRegistrationStatus.toLowerCase()}</p>}
      </div>
    </Link>)}</div> : <Empty text={emptyCopy[view]} />}
  </main></DashboardShell>;
}

function Empty({ text }: { text: string }) {
  return <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold">Nothing here yet</h2><p className="mt-2 text-sm text-slate-500">{text}</p></div>;
}
