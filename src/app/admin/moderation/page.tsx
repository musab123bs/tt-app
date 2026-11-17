import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, Pagination, Panel, StatusBadge, Td, formatDate, label } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { parsePage } from "@/lib/admin/pagination";
import { listModeration } from "@/lib/services/admin/overview";

export const instant = false;

export default async function AdminModerationPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const { restricted, actions, meta } = await listModeration({ page: parsePage(params.page) });
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Moderation" description="Suspended and restricted accounts, and the full moderation history. Manage an account from its user page." />
    <Panel title={`Currently suspended or restricted (${restricted.length})`} className="mb-6">
      {restricted.length ? <ul className="divide-y divide-slate-100">{restricted.map((user) => <li key={user.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><div><Link href={`/admin/users/${user.id}`} className="font-medium hover:text-blue-700">{user.name}</Link> <span className="text-slate-500">{user.email}</span><p className="text-xs text-slate-500">{user.suspensionReason}</p></div><div className="text-right"><StatusBadge value={user.status} />{user.status === "SUSPENDED" && <p className="mt-1 text-xs text-slate-500">{user.suspendedUntil ? `until ${formatDate(user.suspendedUntil)}` : "indefinite"}</p>}</div></li>)}</ul> : <p className="text-sm text-slate-500">No accounts are currently suspended or restricted.</p>}
    </Panel>
    <DataTable headers={["Action", "User", "Reason", "Period", "By", "When"]} empty={!actions.length}>
      {actions.map((action) => <tr key={action.id}>
        <Td><StatusBadge value={action.action === "REACTIVATE" ? "ACTIVE" : action.action === "SUSPEND" ? "SUSPENDED" : action.action === "RESTRICT" ? "RESTRICTED" : "DELETED"} /> <span className="ml-1 text-xs text-slate-500">{label(action.action)}</span></Td>
        <Td><Link href={`/admin/users/${action.user.id}`} className="hover:text-blue-700">{action.user.name}</Link></Td>
        <Td className="max-w-xs whitespace-normal">{action.reason}</Td>
        <Td className="text-xs">{formatDate(action.startsAt)}{action.endsAt ? ` → ${formatDate(action.endsAt)}` : ""}</Td>
        <Td>{action.admin.name}</Td>
        <Td>{formatDate(action.createdAt)}</Td>
      </tr>)}
    </DataTable>
    <Pagination meta={meta} basePath="/admin/moderation" params={{}} />
  </AdminShell>;
}
