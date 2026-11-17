import Link from "next/link";
import { notFound } from "next/navigation";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { LiveMatchScoreboard } from "@/components/matches/live-match-scoreboard";
import { getAccessibleMatch } from "@/lib/services/matches";
import { requireUser } from "@/lib/session";

export const instant = false;

export default async function MatchDetailPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const session = await requireUser();
  const { matchId } = await params;
  const match = await getAccessibleMatch(session.user.id, matchId);
  if (!match) notFound();

  return (
    <DashboardShell playerName={session.user.name ?? "Player"} playerImage={session.user.image ?? null}>
      <main className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6 lg:p-8">
        <LiveMatchScoreboard initialMatch={match} />
        <p className="text-sm text-slate-500">Is this result wrong or suspicious? <Link href={`/reports?type=INCORRECT_RESULT&matchId=${match.id}`} className="text-blue-700 hover:underline">Report this match</Link></p>
      </main>
    </DashboardShell>
  );
}
