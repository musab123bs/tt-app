import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TournamentForm } from "@/components/tournaments/tournament-form";
import { isAdminRole } from "@/lib/roles";
import { getTournamentDetail } from "@/lib/services/tournaments";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function EditTournamentPage({ params }: { params: Promise<{ tournamentId: string }> }) {
  const session = await requireUser();
  const { tournamentId } = await params;
  const tournament = await getTournamentDetail(tournamentId, session.user.id, isAdminRole(session.user.role));
  if (!tournament) notFound();
  if (!tournament.isOrganizer || tournament.drawGeneratedAt || !["DRAFT", "OPEN_REGISTRATION"].includes(tournament.status)) redirect(`/tournaments/${tournamentId}`);
  const hasRegistrations = tournament.participants.some((participant) => participant.status === "APPROVED" || participant.status === "PENDING");
  return <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}><main className="p-4 sm:p-6 lg:p-8">
    <Link href={`/tournaments/${tournamentId}`} className="text-sm text-slate-500 hover:text-slate-900">← Back to tournament</Link>
    <div className="mt-4"><PageHeader title="Edit tournament" description="Update details before the draw is generated." /></div>
    <div className="mt-6 max-w-3xl"><TournamentForm tournament={tournament} lockedSettings={hasRegistrations} /></div>
  </main></DashboardShell>;
}
