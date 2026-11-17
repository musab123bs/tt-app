import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, FilterBar, Pagination, StatusBadge, Td, formatDate, options } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { parsePage } from "@/lib/admin/pagination";
import { listReports, REPORT_STATUSES, REPORT_TYPES, reportTypeLabels } from "@/lib/services/reports";

export const instant = false;

export default async function AdminReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const filters = { status: params.status, type: params.type };
  const { reports, meta } = await listReports({ ...filters, page: parsePage(params.page) });
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Reports & disputes" description="Player-submitted reports and their review workflow." />
    <FilterBar basePath="/admin/reports" values={filters} fields={[{ name: "status", label: "Status", options: options(REPORT_STATUSES) }, { name: "type", label: "Type", options: REPORT_TYPES.map((type) => [type, reportTypeLabels[type]] as const) }]} />
    <DataTable headers={["Report", "Reporter", "Status", "Submitted"]} empty={!reports.length}>
      {reports.map((report) => <tr key={report.id} className="hover:bg-slate-50">
        <Td><Link href={`/admin/reports/${report.id}`} className="font-medium hover:text-blue-700">{reportTypeLabels[report.type]}</Link><p className="max-w-md truncate text-xs text-slate-500">{report.description}</p></Td>
        <Td>{report.reporter.name}</Td>
        <Td><StatusBadge value={report.status} /></Td>
        <Td>{formatDate(report.createdAt)}</Td>
      </tr>)}
    </DataTable>
    <Pagination meta={meta} basePath="/admin/reports" params={filters} />
  </AdminShell>;
}
