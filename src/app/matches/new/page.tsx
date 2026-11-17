import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MatchCreateForm } from "@/components/matches/match-create-form";
import { PageHeader } from "@/components/shared/page-header";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function NewMatchPage() {
  const session = await requireUser();

  return (
    <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}>
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Create a match"
          description="Set up a singles match. Your account will be Player 1."
          action={<Link href="/matches" className="rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50">Back to matches</Link>}
        />
        <div className="mt-6">
          <MatchCreateForm playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null} />
        </div>
      </div>
    </DashboardShell>
  );
}
