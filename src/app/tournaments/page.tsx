import Link from "next/link";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { getTournaments } from "@/lib/services/tournaments";
import { requireUser } from "@/lib/session";

export const instant = false;
const date = (value: string) => new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(new Date(value));
export default async function TournamentsPage() {
  const session = await requireUser();
  const tournaments = await getTournaments({ userId: session.user.id });
  return <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}><main className="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Tournaments" description="Find competitions, follow results, and manage your events." action={<Link href="/tournaments/new" className="rounded-full bg-[#0B82FF] px-4 py-2.5 text-sm font-medium text-white">Create tournament</Link>} />
    {tournaments.length ? <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">{tournaments.map((tournament) => <Link key={tournament.id} href={`/tournaments/${tournament.id}`} className="overflow-hidden rounded-2xl border border-slate-200 bg-white transition hover:-translate-y-0.5 hover:shadow-md">
      {tournament.bannerImage ? <img src={tournament.bannerImage} alt="" className="h-40 w-full object-cover" /> : <div className="h-32 bg-slate-100" />}
      <div className="p-5"><div className="flex items-start justify-between gap-3"><h2 className="font-semibold text-slate-900">{tournament.name}</h2><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600">{tournament.status.replaceAll("_", " ")}</span></div><p className="mt-2 text-sm text-slate-500">{tournament.location || "Location to be announced"} · {date(tournament.startDate)}</p><p className="mt-3 text-sm text-slate-600">{tournament.participantCount} / {tournament.maxParticipants} players · {tournament.format === "ROUND_ROBIN" ? "Round robin" : "Single elimination"}</p></div>
    </Link>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold">No tournaments yet</h2><p className="mt-2 text-sm text-slate-500">Create an event or check back when organizers publish one.</p></div>}
  </main></DashboardShell>;
}
