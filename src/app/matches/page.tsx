import Link from "next/link";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { MatchHistoryList } from "@/components/matches/match-history-list";
import { PageHeader } from "@/components/shared/page-header";
import { matchFilterSchema } from "@/lib/matches/validation";
import { requireUser } from "@/lib/session";
import { getPlayerMatchList } from "@/lib/services/matches";

export const instant = false;

export default async function MatchesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requireUser();
  const query = await searchParams;
  const parsedFilter = matchFilterSchema.safeParse(query.filter ?? "all");
  const filter = parsedFilter.success ? parsedFilter.data : "all";
  const matches = await getPlayerMatchList(session.user.id, filter);

  return (
    <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}>
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title="Match history"
          description="Scheduled, live, and completed singles matches with official scores."
          action={
            <Link href="/matches/new" className="inline-flex items-center justify-center rounded-full bg-[#0B82FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B82FF]">
              Create match
            </Link>
          }
        />
        <section aria-label="Player match history" className="mt-6">
          <MatchHistoryList matches={matches} filter={filter} playerId={session.user.id} />
        </section>
      </div>
    </DashboardShell>
  );
}
