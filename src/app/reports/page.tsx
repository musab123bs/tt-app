import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { ReportForm } from "@/components/reports/report-form";
import { PageHeader } from "@/components/shared/page-header";
import { getPrismaClient } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { listMyReports, reportTypeLabels } from "@/lib/services/reports";

export const instant = false;

const displayName = (user: { name: string; playerProfile: { fullName: string } | null }) => user.playerProfile?.fullName?.trim() || user.name;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const session = await requireUser();
  const params = await searchParams;
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const userId = session.user.id;
  const player = { select: { id: true, name: true, playerProfile: { select: { fullName: true } } } } as const;
  const [matches, tournaments, players, mine] = await Promise.all([
    prisma.match.findMany({ where: { OR: [{ player1Id: userId }, { player2Id: userId }, ...(params.matchId ? [{ id: params.matchId }] : [])] }, orderBy: { scheduledAt: "desc" }, take: 50, select: { id: true, scheduledAt: true, player1: player, player2: player } }),
    prisma.tournament.findMany({ where: { OR: [{ status: { not: "DRAFT" } }, { createdById: userId }] }, orderBy: { startDate: "desc" }, take: 50, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { id: { not: userId }, status: { not: "DELETED" }, OR: [{ playerProfile: { is: { isPublic: true } } }, ...(params.userId ? [{ id: params.userId }] : [])] }, orderBy: { name: "asc" }, take: 200, select: { id: true, name: true, playerProfile: { select: { fullName: true } } } }),
    listMyReports(userId),
  ]);
  return <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}><main className="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Report an issue" description="Report incorrect results, suspicious activity, inappropriate profiles or tournament disputes." />
    <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <ReportForm initial={{ type: params.type, matchId: params.matchId, tournamentId: params.tournamentId, userId: params.userId }}
        matches={matches.map((match) => ({ id: match.id, label: `${displayName(match.player1)} vs ${displayName(match.player2)} · ${match.scheduledAt.toISOString().slice(0, 10)}` }))}
        tournaments={tournaments.map((tournament) => ({ id: tournament.id, label: tournament.name }))}
        players={players.map((user) => ({ id: user.id, label: displayName(user) }))} />
      <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-semibold">My reports</h2>
        {mine.length ? <ul className="mt-3 divide-y divide-slate-100">{mine.map((report) => <li key={report.id} className="py-3 text-sm"><div className="flex items-center justify-between gap-2"><span className="font-medium">{reportTypeLabels[report.type]}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs">{report.status.replaceAll("_", " ").toLowerCase()}</span></div><p className="text-xs text-slate-500">{report.createdAt.toISOString().slice(0, 10)}</p>{report.resolution && <p className="mt-1 text-slate-600">{report.resolution}</p>}</li>)}</ul> : <p className="mt-3 text-sm text-slate-500">You haven&apos;t submitted any reports.</p>}
      </section>
    </div>
  </main></DashboardShell>;
}
