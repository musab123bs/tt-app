import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Swords } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { MatchFilter, MatchSummary } from "@/lib/matches/types";

const filters: Array<{ value: MatchFilter; label: string }> = [
  { value: "all", label: "All matches" },
  { value: "won", label: "Won" },
  { value: "lost", label: "Lost" },
  { value: "in_progress", label: "In progress" },
];

export function MatchHistoryList({
  matches,
  filter,
  playerId,
}: {
  matches: MatchSummary[];
  filter: MatchFilter;
  playerId: string;
}) {
  return (
    <>
      <nav aria-label="Filter match history" className="mb-5 flex flex-wrap gap-2">
        {filters.map((item) => (
          <Link
            key={item.value}
            href={item.value === "all" ? "/matches" : `/matches?filter=${item.value}`}
            aria-current={filter === item.value ? "page" : undefined}
            className={`rounded-full px-4 py-2 text-sm font-medium transition ${filter === item.value ? "bg-[#0B82FF] text-white" : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
          >
            {item.label}
          </Link>
        ))}
      </nav>

      {matches.length === 0 ? (
        <Card className="px-5 py-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-blue-700">
            <Swords className="h-5 w-5" aria-hidden="true" />
          </div>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">No matches here yet</h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
            Create a match with another registered player to start building your real match history.
          </p>
          <Link href="/matches/new" className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#0B82FF] px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
            Create a match <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </Card>
      ) : (
        <div className="space-y-3">
          {matches.map((match) => {
            const player1 = match.player1.id === playerId;
            const opponent = player1 ? match.player2 : match.player1;
            const result = match.status === "COMPLETED"
              ? match.winnerId === playerId ? "Won" : "Lost"
              : null;
            const score = player1
              ? `${match.player1GamesWon}–${match.player2GamesWon}`
              : `${match.player2GamesWon}–${match.player1GamesWon}`;
            const playedAt = match.completedAt ?? match.scheduledAt;

            return (
              <Link key={match.id} href={`/matches/${match.id}`} className="block rounded-2xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B82FF]">
                <Card className="flex flex-col gap-4 p-4 transition hover:border-blue-200 hover:shadow-md sm:flex-row sm:items-center sm:p-5">
                  <PlayerAvatar name={opponent.name} image={opponent.image} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate font-semibold text-slate-900">vs {opponent.name}</h2>
                      <StatusLabel status={match.status} result={result} />
                    </div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />{formatDate(playedAt)}</span>
                      {match.location && <span className="inline-flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />{match.location}</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-3 sm:border-0 sm:pt-0 sm:text-right">
                    <div>
                      <p className="text-sm font-semibold tabular-nums text-slate-900">{score}</p>
                      <p className="mt-0.5 text-xs text-slate-500">Singles · Best of {match.bestOf}</p>
                    </div>
                    <ArrowUpRight className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

function PlayerAvatar({ name, image }: { name: string; image: string | null }) {
  return image ? (
    <Image src={image} alt={`${name}'s profile`} width={48} height={48} unoptimized className="h-12 w-12 shrink-0 rounded-full border border-slate-200 object-cover" />
  ) : (
    <div aria-label={`${name}'s default avatar`} role="img" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
      {name.trim().slice(0, 1).toUpperCase() || "P"}
    </div>
  );
}

function StatusLabel({ status, result }: { status: MatchSummary["status"]; result: string | null }) {
  const label = result ?? (status === "IN_PROGRESS" ? "In progress" : status[0] + status.slice(1).toLowerCase());
  const color = result === "Won" ? "bg-emerald-50 text-emerald-700" : result === "Lost" ? "bg-rose-50 text-rose-700" : status === "IN_PROGRESS" ? "bg-amber-50 text-amber-800" : status === "ABANDONED" || status === "CANCELLED" ? "bg-slate-100 text-slate-500" : "bg-blue-50 text-blue-700";
  return <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${color}`}>{label}</span>;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Karachi",
  }).format(new Date(value));
}
