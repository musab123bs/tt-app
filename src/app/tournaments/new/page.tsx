import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { TournamentCreateForm } from "@/components/tournaments/tournament-create-form";
import { requireUser } from "@/lib/session";

export default async function NewTournamentPage() {
  const session = await requireUser();
  return <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}><main className="p-4 sm:p-6 lg:p-8"><PageHeader title="Create a tournament" description="Set up the competition and choose when registration opens." /><div className="mt-6 max-w-3xl"><TournamentCreateForm /></div></main></DashboardShell>;
}
