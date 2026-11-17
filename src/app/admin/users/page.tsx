import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, FilterBar, Pagination, StatusBadge, Td, formatDate, options } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { parsePage } from "@/lib/admin/pagination";
import { ACCOUNT_STATUSES, listUsers, ROLES } from "@/lib/services/admin/users";

export const instant = false;

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const filters = { q: params.q?.trim() || undefined, role: params.role, status: params.status };
  const { users, meta } = await listUsers({ ...filters, page: parsePage(params.page) });
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Users" description="Search accounts, review status and manage roles." />
    <FilterBar basePath="/admin/users" values={filters} fields={[{ name: "q", label: "Search", placeholder: "Name or email" }, { name: "role", label: "Role", options: options(ROLES) }, { name: "status", label: "Status", options: options(ACCOUNT_STATUSES) }]} />
    <DataTable headers={["User", "Role", "Status", "Registered", "Last active"]} empty={!users.length}>
      {users.map((user) => <tr key={user.id} className="hover:bg-slate-50">
        <Td><Link href={`/admin/users/${user.id}`} className="font-medium text-slate-900 hover:text-blue-700">{user.name}</Link><p className="text-xs text-slate-500">{user.email}{user.isSystemAccount ? " · protected" : ""}</p></Td>
        <Td><StatusBadge value={user.role} /></Td>
        <Td><StatusBadge value={user.status} />{user.suspendedUntil && user.status === "SUSPENDED" && <p className="mt-1 text-xs text-slate-500">until {formatDate(user.suspendedUntil)}</p>}</Td>
        <Td>{formatDate(user.createdAt, false)}</Td>
        <Td>{formatDate(user.lastActiveAt)}</Td>
      </tr>)}
    </DataTable>
    <Pagination meta={meta} basePath="/admin/users" params={filters} />
  </AdminShell>;
}
