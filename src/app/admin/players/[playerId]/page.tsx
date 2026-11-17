import Link from "next/link";
import { notFound } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { ProfileCorrectionForm } from "@/components/admin/profile-correction-form";
import { AdminHeader, Panel, StatCard, StatusBadge, formatDate } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getPlayerAdminDetail } from "@/lib/services/admin/players";
import { PLAYER_LEVELS } from "@/lib/services/platform-settings";

export const instant = false;

const name = (player: { name: string; playerProfile: { fullName: string } | null }) => player.playerProfile?.fullName || player.name;

export default async function AdminPlayerDetailPage({ params }: { params: Promise<{ playerId: string }> }) {
  const admin = await requireSuperAdmin();
  const { playerId } = await params;
  const data = await getPlayerAdminDetail(playerId);
  if (!data) notFound();
  const { profile, stats } = data;
  const image = profile.profileImage || profile.user.image;
  return <AdminShell adminName={admin.name}>
    <Link href="/admin/players" className="text-sm text-slate-500 hover:text-slate-900">← Players</Link>
    <div className="mt-3 flex items-center gap-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {image ? <img src={image} alt={`${profile.fullName} profile`} className="h-16 w-16 rounded-full border border-slate-200 object-cover" /> : <span aria-hidden="true" className="flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 text-xl font-semibold text-blue-700">{profile.fullName.slice(0, 1).toUpperCase()}</span>}
      <div className="flex-1"><AdminHeader title={profile.fullName} description={`${profile.user.email} · ${profile.level.toLowerCase()} · joined ${formatDate(profile.user.createdAt, false)}`} action={<div className="flex gap-2"><StatusBadge value={profile.user.status} /><Link href={`/admin/users/${playerId}`} className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm">Account & moderation</Link></div>} /></div>
    </div>
    <div className="grid gap-3 sm:grid-cols-4">
      <StatCard label="Completed matches" value={stats.completed} /><StatCard label="Won" value={stats.won} /><StatCard label="Lost" value={stats.lost} /><StatCard label="Win rate" value={`${stats.winPercentage}%`} />
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Panel title="Correct profile information"><ProfileCorrectionForm userId={playerId} profile={profile} levels={PLAYER_LEVELS} /></Panel>
      <div className="space-y-5">
        <Panel title="Match history">{data.matches.length ? <ul className="divide-y divide-slate-100">{data.matches.map((match) => <li key={match.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><Link href={`/admin/matches/${match.id}`} className="min-w-0 truncate hover:text-blue-700">{name(match.player1)} vs {name(match.player2)} <span className="text-slate-500">· {match.player1GamesWon}–{match.player2GamesWon}</span></Link><span className="flex shrink-0 items-center gap-2">{match.status === "COMPLETED" && <span className={match.winnerId === playerId ? "text-emerald-700" : "text-red-600"}>{match.winnerId === playerId ? "W" : "L"}</span>}<StatusBadge value={match.status} /></span></li>)}</ul> : <p className="text-sm text-slate-500">No matches.</p>}</Panel>
        <Panel title="Tournament participation">{data.participations.length ? <ul className="divide-y divide-slate-100">{data.participations.map((entry) => <li key={entry.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><Link href={`/admin/tournaments/${entry.tournament.id}`} className="min-w-0 truncate hover:text-blue-700">{entry.tournament.name}</Link><span className="flex shrink-0 gap-2">{entry.tournament.winnerId === playerId ? <span className="text-amber-700">Champion</span> : entry.tournament.runnerUpId === playerId ? <span>Runner-up</span> : null}<StatusBadge value={entry.status} /></span></li>)}</ul> : <p className="text-sm text-slate-500">No tournament entries.</p>}</Panel>
        <Panel title="Correction history">{data.corrections.length ? <ul className="divide-y divide-slate-100">{data.corrections.map((log) => <li key={log.id} className="py-2.5 text-sm"><p className="font-medium">{log.admin.name} <span className="font-normal text-slate-500">· {formatDate(log.createdAt)}</span></p><p className="text-slate-600">{log.reason}</p><p className="mt-1 break-all text-xs text-slate-500">{JSON.stringify(log.previousValue)} → {JSON.stringify(log.newValue)}</p></li>)}</ul> : <p className="text-sm text-slate-500">No corrections recorded.</p>}</Panel>
      </div>
    </div>
  </AdminShell>;
}
