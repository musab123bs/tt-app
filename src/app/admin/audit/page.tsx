import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, FilterBar, Pagination, Td, formatDate, label, options } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { parsePage } from "@/lib/admin/pagination";
import { AUDIT_ACTIONS, listAuditLogs } from "@/lib/services/admin/overview";

export const instant = false;

const targetHref: Record<string, (id: string) => string> = {
  User: (id) => `/admin/users/${id}`,
  PlayerProfile: (id) => `/admin/players/${id}`,
  Match: (id) => `/admin/matches/${id}`,
  Tournament: (id) => `/admin/tournaments/${id}`,
  UserReport: (id) => `/admin/reports/${id}`,
  PlatformSettings: () => "/admin/settings",
};

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const filters = { action: params.action, targetType: params.targetType, q: params.q?.trim() || undefined };
  const { logs, meta } = await listAuditLogs({ ...filters, page: parsePage(params.page) });
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Audit logs" description="Read-only record of every administrative action." />
    <FilterBar basePath="/admin/audit" values={filters} fields={[{ name: "action", label: "Action", options: options(AUDIT_ACTIONS) }, { name: "targetType", label: "Target", options: Object.keys(targetHref).map((key) => [key, key] as const) }, { name: "q", label: "Search", placeholder: "Admin, reason or target ID" }]} />
    <DataTable headers={["When", "Admin", "Action", "Target", "Reason", "Change"]} empty={!logs.length}>
      {logs.map((log) => <tr key={log.id}>
        <Td>{formatDate(log.createdAt)}</Td>
        <Td>{log.admin.name}</Td>
        <Td>{label(log.action)}</Td>
        <Td>{targetHref[log.targetType] ? <Link href={targetHref[log.targetType](log.targetId)} className="text-blue-700">{log.targetType}</Link> : log.targetType}<p className="text-xs text-slate-400">{log.targetId}</p></Td>
        <Td className="max-w-xs whitespace-normal">{log.reason ?? "—"}</Td>
        <Td className="max-w-md whitespace-normal"><details><summary className="cursor-pointer text-xs text-blue-700">View</summary><pre className="mt-2 max-h-60 overflow-auto rounded-lg bg-slate-50 p-2 text-[11px]">{JSON.stringify({ previous: log.previousValue, new: log.newValue }, null, 2)}</pre></details></Td>
      </tr>)}
    </DataTable>
    <Pagination meta={meta} basePath="/admin/audit" params={filters} />
  </AdminShell>;
}
