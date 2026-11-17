import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, Panel, StatCard, StatusBadge, formatDate, label } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getAdminOverview } from "@/lib/services/admin/overview";

export const instant = false;

export default async function AdminOverviewPage() {
  const admin = await requireSuperAdmin();
  const data = await getAdminOverview();
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Platform overview" description="Live figures from the platform database." />
    {(data.openReports > 0 || data.matches.underReview > 0) && <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><Link href="/admin/reports?status=PENDING" className="font-medium underline">{data.openReports} open report{data.openReports === 1 ? "" : "s"}</Link> and <Link href="/admin/matches?review=UNDER_REVIEW" className="font-medium underline">{data.matches.underReview} match{data.matches.underReview === 1 ? "" : "es"} under review</Link> need attention.</div>}
    <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-500">Users</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Registered users" value={data.users.total} href="/admin/users" />
      <StatCard label="Active (30 days)" value={data.users.active} />
      <StatCard label="Suspended" value={data.users.suspended} href="/admin/users?status=SUSPENDED" />
      <StatCard label="Restricted" value={data.users.restricted} href="/admin/users?status=RESTRICTED" />
      <StatCard label="New this week" value={data.users.newThisWeek} />
      <StatCard label="Completed profiles" value={data.users.completedProfiles} />
    </div>
    <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Matches</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      <StatCard label="Total matches" value={data.matches.total} href="/admin/matches" />
      <StatCard label="Completed" value={data.matches.completed} href="/admin/matches?status=COMPLETED" />
      <StatCard label="Ongoing" value={data.matches.ongoing} href="/admin/matches?status=IN_PROGRESS" />
      <StatCard label="Cancelled / abandoned" value={data.matches.cancelled} href="/admin/matches?status=CANCELLED" />
      <StatCard label="Played this week" value={data.matches.thisWeek} />
      <StatCard label="Played this month" value={data.matches.thisMonth} />
    </div>
    <h2 className="mb-3 mt-6 text-sm font-semibold uppercase tracking-wide text-slate-500">Tournaments</h2>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <StatCard label="Total tournaments" value={data.tournaments.total} href="/admin/tournaments" />
      <StatCard label="Upcoming" value={data.tournaments.upcoming} />
      <StatCard label="Ongoing" value={data.tournaments.ongoing} href="/admin/tournaments?status=IN_PROGRESS" />
      <StatCard label="Completed" value={data.tournaments.completed} href="/admin/tournaments?status=COMPLETED" />
      <StatCard label="Cancelled" value={data.tournaments.cancelled} href="/admin/tournaments?status=CANCELLED" />
    </div>
    <div className="mt-6 grid gap-5 xl:grid-cols-2">
      <Panel title="Recent registrations">{data.recent.users.length ? <ul className="divide-y divide-slate-100">{data.recent.users.map((user) => <li key={user.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><Link href={`/admin/users/${user.id}`} className="min-w-0 truncate font-medium hover:text-blue-700">{user.name} <span className="font-normal text-slate-500">{user.email}</span></Link><span className="shrink-0 text-xs text-slate-500">{formatDate(user.createdAt)}</span></li>)}</ul> : <p className="text-sm text-slate-500">No users yet.</p>}</Panel>
      <Panel title="Recent matches">{data.recent.matches.length ? <ul className="divide-y divide-slate-100">{data.recent.matches.map((match) => <li key={match.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><Link href={`/admin/matches/${match.id}`} className="min-w-0 truncate font-medium hover:text-blue-700">{match.player1.name} vs {match.player2.name}</Link><StatusBadge value={match.status} /></li>)}</ul> : <p className="text-sm text-slate-500">No matches yet.</p>}</Panel>
      <Panel title="Recent tournaments">{data.recent.tournaments.length ? <ul className="divide-y divide-slate-100">{data.recent.tournaments.map((tournament) => <li key={tournament.id} className="flex items-center justify-between gap-3 py-2.5 text-sm"><Link href={`/admin/tournaments/${tournament.id}`} className="min-w-0 truncate font-medium hover:text-blue-700">{tournament.name}</Link><StatusBadge value={tournament.status} /></li>)}</ul> : <p className="text-sm text-slate-500">No tournaments yet.</p>}</Panel>
      <Panel title="Recent administrative actions" action={<Link href="/admin/audit" className="text-sm text-blue-700">View all</Link>}>{data.recent.audit.length ? <ul className="divide-y divide-slate-100">{data.recent.audit.map((log) => <li key={log.id} className="py-2.5 text-sm"><p><span className="font-medium">{log.admin.name}</span> · {label(log.action)}</p><p className="text-xs text-slate-500">{log.targetType} {log.targetId.slice(0, 10)}… · {formatDate(log.createdAt)}</p></li>)}</ul> : <p className="text-sm text-slate-500">No administrative actions recorded yet.</p>}</Panel>
    </div>
  </AdminShell>;
}
