import { Suspense } from "react";

import { PlayerComparison } from "@/components/analytics/player-comparison";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PageHeader } from "@/components/shared/page-header";
import { getPrismaClient } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getHeadToHeadAnalytics } from "@/lib/services/analytics";

export default function ComparePage({ searchParams }: { searchParams: Promise<{ playerB?: string }> }) {
  return <Suspense fallback={<div className="min-h-screen animate-pulse bg-slate-100 p-8"><div className="mx-auto h-64 max-w-4xl rounded-2xl bg-white" /></div>}><CompareContent searchParams={searchParams} /></Suspense>;
}

async function CompareContent({ searchParams }: { searchParams: Promise<{ playerB?: string }> }) {
  const [session, query] = await Promise.all([requireUser(), searchParams]);
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const current = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, level: true } } } });
  if (!current) throw new Error("Player account not found.");
  const playerA = { id: current.id, name: current.playerProfile?.fullName?.trim() || current.name, image: current.playerProfile?.profileImage || current.image, level: current.playerProfile?.level ?? null };
  const initialComparison = query.playerB ? await getHeadToHeadAnalytics(current.id, query.playerB, current.id) : null;
  const initialPlayerB = initialComparison?.playerB ?? null;

  return <DashboardShell playerName={playerA.name} playerImage={playerA.image}><div className="p-4 sm:p-6 lg:p-8">
    <PageHeader title="Player comparison" description="Compare official completed match records between you and another public player." />
    <div className="mt-6"><PlayerComparison playerA={playerA} initialPlayerB={initialPlayerB} initialComparison={initialComparison} /></div>
  </div></DashboardShell>;
}
