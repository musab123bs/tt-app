import Link from "next/link";
import { notFound } from "next/navigation";

import { ActionDialog } from "@/components/admin/action-dialog";
import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, Panel, StatusBadge, formatDate, label, options } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getUserAdminDetail, ROLES } from "@/lib/services/admin/users";

export const instant = false;

export default async function AdminUserDetailPage({ params }: { params: Promise<{ userId: string }> }) {
  const admin = await requireSuperAdmin();
  const { userId } = await params;
  const user = await getUserAdminDetail(userId);
  if (!user) notFound();
  const isSelf = user.id === admin.id;
  const locked = isSelf || user.isSystemAccount || user.status === "DELETED";
  const endpoint = `/api/admin/users/${user.id}`;
  const counts = user._count;

  return <AdminShell adminName={admin.name}>
    <Link href="/admin/users" className="text-sm text-slate-500 hover:text-slate-900">← Users</Link>
    <div className="mt-3"><AdminHeader title={user.playerProfile?.fullName || user.name} description={user.email} action={<div className="flex gap-2"><StatusBadge value={user.role} /><StatusBadge value={user.effectiveStatus} /></div>} /></div>
    {locked && <p className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600">{isSelf ? "This is your own account. To protect your access, your role and status cannot be changed here." : user.isSystemAccount ? "This is a protected system account. Its role and status cannot be changed from the admin panel." : "This account has been deleted. Historical records are preserved."}</p>}
    {!locked && <div className="mb-6 flex flex-wrap gap-2">
      <ActionDialog label="Change role" title="Change user role" description="Role changes take effect immediately and are recorded in the audit log." endpoint={endpoint} payload={{ action: "role" }} fields={[{ name: "role", label: "New role", type: "select", options: options(ROLES), defaultValue: user.role, required: true }, { name: "reason", label: "Reason", type: "textarea", required: true }]} />
      {user.effectiveStatus === "ACTIVE" && <ActionDialog label="Suspend" title="Suspend account" description="The user can still sign in but cannot create matches, register for tournaments or edit restricted profile data. Leave the end date empty for an indefinite suspension." endpoint={endpoint} payload={{ action: "suspend" }} tone="danger" confirmLabel="Suspend" fields={[{ name: "startsAt", label: "Starts", type: "datetime-local" }, { name: "endsAt", label: "Ends (optional)", type: "datetime-local" }, { name: "reason", label: "Reason", type: "textarea", required: true }]} />}
      {user.effectiveStatus === "ACTIVE" && <ActionDialog label="Restrict permanently" title="Permanently restrict account" description="The account stays restricted until an administrator reactivates it." endpoint={endpoint} payload={{ action: "restrict" }} tone="danger" confirmLabel="Restrict" />}
      {user.effectiveStatus !== "ACTIVE" && <ActionDialog label="Reactivate" title="Reactivate account" description="Lift the suspension or restriction immediately." endpoint={endpoint} payload={{ action: "reactivate" }} tone="primary" confirmLabel="Reactivate" />}
      <ActionDialog label="Delete account" title="Delete this account" description="Personal data, credentials and sessions are removed. Matches and tournament history stay intact and show a deleted user. This cannot be undone." endpoint={endpoint} payload={{ action: "delete" }} tone="danger" confirmLabel="Delete permanently" redirectTo="/admin/users" fields={[{ name: "confirmEmail", label: `Type ${user.email} to confirm`, type: "email", required: true }, { name: "reason", label: "Reason", type: "textarea", required: true }]} />
    </div>}
    <div className="grid gap-5 lg:grid-cols-2">
      <Panel title="Account">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[["Registered", formatDate(user.createdAt)], ["Last active", formatDate(user.lastActiveAt)], ["Email verified", user.emailVerified ? "Yes" : "No"], ["Suspended until", user.effectiveStatus === "SUSPENDED" ? (user.suspendedUntil ? formatDate(user.suspendedUntil) : "Indefinite") : "—"], ["Moderation reason", user.suspensionReason ?? "—"], ["Deleted", formatDate(user.deletedAt)]].map(([term, value]) => <div key={term}><dt className="text-xs text-slate-500">{term}</dt><dd className="mt-0.5 font-medium">{value}</dd></div>)}
        </dl>
        {user.playerProfile && <Link href={`/admin/players/${user.id}`} className="mt-4 inline-block text-sm text-blue-700">Open player management →</Link>}
      </Panel>
      <Panel title="Activity">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          {[["Matches", counts.matchesAsPlayer1 + counts.matchesAsPlayer2], ["Tournament entries", counts.tournamentRegistrations], ["Tournaments organized", counts.tournamentsCreated], ["Reports filed", counts.reportsFiled], ["Reports against", counts.reportsAgainst]].map(([term, value]) => <div key={term}><dt className="text-xs text-slate-500">{term}</dt><dd className="mt-0.5 text-lg font-semibold">{value}</dd></div>)}
        </dl>
      </Panel>
      <Panel title="Moderation history" className="lg:col-span-2">
        {user.moderationActions.length ? <ul className="divide-y divide-slate-100">{user.moderationActions.map((action) => <li key={action.id} className="py-3 text-sm"><p className="font-medium">{label(action.action)} <span className="font-normal text-slate-500">by {action.admin.name} · {formatDate(action.createdAt)}</span></p><p className="text-slate-600">{action.reason}</p>{action.endsAt && <p className="text-xs text-slate-500">Ends {formatDate(action.endsAt)}</p>}</li>)}</ul> : <p className="text-sm text-slate-500">No moderation actions.</p>}
      </Panel>
    </div>
  </AdminShell>;
}
