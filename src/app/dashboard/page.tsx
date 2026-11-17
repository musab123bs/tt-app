import Link from "next/link";
import Image from "next/image";
import {
  ArrowUpRight,
  CircleHelp,
  Crosshair,
  Gamepad2,
  Goal,
  Percent,
  Swords,
  Trophy,
} from "lucide-react";
import { Suspense } from "react";

import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { PerformanceCharts } from "@/components/dashboard/performance-charts";
import { PageHeader } from "@/components/shared/page-header";
import { Card } from "@/components/ui/card";
import { getPlayerDashboardStats } from "@/lib/services/player-statistics";
import { requireUser } from "@/lib/session";

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

async function DashboardContent() {
  const session = await requireUser();
  const stats = await getPlayerDashboardStats(session.user.id);

  return (
    <DashboardShell playerName={stats.player.name} playerImage={stats.player.avatar}>
      <div className="p-4 sm:p-6 lg:p-8">
        <PageHeader
          title={`Welcome back, ${stats.player.name}`}
          description="Here's an overview of your table tennis activity and performance."
          action={
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 self-start rounded-full bg-[#0B82FF] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B82FF] sm:self-auto"
            >
              View profile
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          }
        />

        <section aria-label="Player information" className="mt-6">
          <Card className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-4">
              <PlayerAvatar name={stats.player.name} image={stats.player.avatar} size="large" />
              <div className="min-w-0">
                <h2 className="truncate text-lg font-semibold text-slate-900">{stats.player.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {[stats.player.level ? formatLevel(stats.player.level) : null, stats.player.clubName, stats.player.location]
                    .filter(Boolean)
                    .join(" · ") || "Add your playing details to personalize your dashboard."}
                </p>
              </div>
            </div>
            <div className="rounded-xl bg-blue-50 px-4 py-3 sm:min-w-44">
              <p className="text-xs font-medium uppercase tracking-wide text-blue-700">Player level</p>
              <p className="mt-1 text-base font-semibold text-slate-900">
                {stats.player.level ? formatLevel(stats.player.level) : "Not set"}
              </p>
            </div>
          </Card>
        </section>

        <section aria-label="Match statistics" className="mt-6">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Match overview</h2>
            <p className="mt-1 text-sm text-slate-500">Based on completed matches with recorded results.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatisticCard
              label="Total matches"
              value={stats.matches.total.toLocaleString()}
              description="Completed matches"
              icon={Swords}
              iconClass="bg-blue-50 text-blue-700"
            />
            <StatisticCard
              label="Matches won"
              value={stats.matches.wins.toLocaleString()}
              description="Recorded victories"
              icon={Trophy}
              iconClass="bg-emerald-50 text-emerald-700"
            />
            <StatisticCard
              label="Matches lost"
              value={stats.matches.losses.toLocaleString()}
              description="Recorded defeats"
              icon={Crosshair}
              iconClass="bg-rose-50 text-rose-700"
            />
            <StatisticCard
              label="Win rate"
              value={`${formatWinRate(stats.matches.winRate)}%`}
              description="Wins from completed matches"
              icon={Percent}
              iconClass="bg-violet-50 text-violet-700"
            />
          </div>
        </section>

        <section aria-label="Additional performance statistics" className="mt-8">
          <div className="mb-3">
            <h2 className="text-lg font-semibold text-slate-900">Performance statistics</h2>
            <p className="mt-1 text-sm text-slate-500">Game and point totals require recorded match results.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <StatisticCard
              label="Games won"
              value={stats.games.won.toLocaleString()}
              description="Across completed matches"
              icon={Gamepad2}
              iconClass="bg-blue-50 text-blue-700"
              compact
            />
            <StatisticCard
              label="Games lost"
              value={stats.games.lost.toLocaleString()}
              description="Across completed matches"
              icon={Gamepad2}
              iconClass="bg-rose-50 text-rose-700"
              compact
            />
            <StatisticCard
              label="Points won"
              value={stats.points.won.toLocaleString()}
              description="Points scored"
              icon={Goal}
              iconClass="bg-emerald-50 text-emerald-700"
              compact
            />
            <StatisticCard
              label="Points lost"
              value={stats.points.lost.toLocaleString()}
              description="Points conceded"
              icon={Goal}
              iconClass="bg-amber-50 text-amber-700"
              compact
            />
            <StatisticCard
              label="Winning streak"
              value={stats.winningStreak.toLocaleString()}
              description="Consecutive match wins"
              icon={Trophy}
              iconClass="bg-violet-50 text-violet-700"
              compact
            />
          </div>
        </section>

        <section aria-label="Best performance" className="mt-4">
          <Card className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <CircleHelp className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 className="font-semibold text-slate-900">Best performance</h2>
              <p className="mt-1 text-sm text-slate-600">
                {stats.bestPerformance ??
                  "Not available yet. Complete match records are needed before this can be calculated."}
              </p>
            </div>
          </Card>
        </section>

        <PerformanceCharts
          matchPerformance={stats.matchPerformance}
          winLossDistribution={stats.winLossDistribution}
          gamePerformance={stats.gamePerformance}
          performanceTrend={stats.performanceTrend}
        />

        <section aria-label="Recent matches" className="mt-8">
          <Card>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Recent matches</h2>
                <p className="mt-1 text-sm text-slate-500">Your latest recorded match activity.</p>
              </div>
              <Link href="/matches" className="text-sm font-medium text-[#0B82FF] hover:text-blue-700">
                View match history
              </Link>
            </div>
            {stats.recentMatches.length === 0 ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-10 text-center">
                <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-white text-slate-500 shadow-sm">
                  <Swords className="h-5 w-5" aria-hidden="true" />
                </div>
                <h3 className="mt-3 font-semibold text-slate-800">No matches recorded yet</h3>
                <p className="mx-auto mt-1 max-w-md text-sm leading-5 text-slate-500">
                  Create your first match to start keeping real match results and player statistics.
                </p>
                <Link href="/matches/new" className="mt-4 inline-flex rounded-full bg-[#0B82FF] px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Create a match</Link>
              </div>
            ) : (
              <div className="mt-5 divide-y divide-slate-100">
                {stats.recentMatches.map((match) => (
                  <Link key={match.id} href={`/matches/${match.id}`} className="flex items-center gap-3 py-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B82FF]">
                    <PlayerAvatar name={match.opponentName} image={match.opponentImage} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-slate-900">{match.opponentName}</p>
                      <p className="text-xs text-slate-500">
                        {new Intl.DateTimeFormat("en", { dateStyle: "medium", timeZone: "Asia/Karachi" }).format(new Date(match.playedAt))} · {match.format}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-slate-800">{match.finalScore}</p>
                      <p className="text-xs text-slate-500">{match.result} · {match.status}</p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </section>

        <section aria-label="Profile completion" className="mt-8">
          <Card>
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-semibold text-slate-900">Profile completion</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Add player details to complete your profile.
                    </p>
                  </div>
                  <span className="text-xl font-semibold tabular-nums text-[#0B82FF]">
                    {stats.profileCompletion.percentage}%
                  </span>
                </div>
                <div
                  className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100"
                  role="progressbar"
                  aria-label="Profile completion"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={stats.profileCompletion.percentage}
                >
                  <div
                    className="h-full rounded-full bg-[#0B82FF] transition-[width]"
                    style={{ width: `${stats.profileCompletion.percentage}%` }}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {stats.profileCompletion.completedFields} of {stats.profileCompletion.totalFields} profile fields provided
                </p>
                {stats.profileCompletion.missingFields.length > 0 ? (
                  <p className="mt-3 text-sm text-slate-600">
                    Still missing: {stats.profileCompletion.missingFields.join(", ")}.
                  </p>
                ) : (
                  <p className="mt-3 text-sm font-medium text-emerald-700">Your player profile is complete.</p>
                )}
              </div>
              <Link
                href="/profile"
                className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B82FF]"
              >
                Edit profile
                <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
          </Card>
        </section>
      </div>
    </DashboardShell>
  );
}

function StatisticCard({
  label,
  value,
  description,
  icon: Icon,
  iconClass,
  compact = false,
}: {
  label: string;
  value: string;
  description: string;
  icon: typeof Swords;
  iconClass: string;
  compact?: boolean;
}) {
  return (
    <Card className={compact ? "p-4" : "p-5"}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-slate-600">{label}</p>
          <p className={`mt-3 font-semibold tabular-nums text-slate-900 ${compact ? "text-2xl" : "text-3xl"}`}>
            {value}
          </p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}>
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-xs leading-5 text-slate-500">{description}</p>
    </Card>
  );
}

function PlayerAvatar({
  name,
  image,
  size = "normal",
}: {
  name: string;
  image: string | null;
  size?: "normal" | "large";
}) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
  const dimension = size === "large" ? "h-16 w-16 text-lg" : "h-11 w-11 text-sm";

  return image ? (
    <Image
      src={image}
      alt={`${name}'s profile`}
      width={size === "large" ? 64 : 44}
      height={size === "large" ? 64 : 44}
      unoptimized
      className={`${dimension} shrink-0 rounded-full border border-slate-200 object-cover`}
    />
  ) : (
    <div
      aria-label={`${name}'s default avatar`}
      role="img"
      className={`flex ${dimension} shrink-0 items-center justify-center rounded-full bg-blue-100 font-semibold text-blue-700`}
    >
      {initials || "P"}
    </div>
  );
}

function formatLevel(level: string) {
  return level.toLowerCase().replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function formatWinRate(rate: number) {
  return rate === 0 ? "0" : rate.toFixed(1);
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-slate-100 p-4 sm:p-6 lg:p-8" aria-label="Loading dashboard">
      <div className="mx-auto max-w-[1600px] animate-pulse space-y-6">
        <div className="h-16 rounded-xl bg-white" />
        <div className="h-20 rounded-2xl bg-slate-200" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-36 rounded-2xl bg-white" />
          ))}
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-32 rounded-2xl bg-white" />
          ))}
        </div>
        <div className="grid gap-5 xl:grid-cols-2">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="h-80 rounded-2xl bg-white" />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-white" />
      </div>
    </div>
  );
}
