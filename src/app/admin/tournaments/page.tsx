import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, FilterBar, Pagination, StatusBadge, Td, formatDate, options } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { parsePage } from "@/lib/admin/pagination";
import { listTournamentsForAdmin } from "@/lib/services/admin/tournaments";

export const instant = false;

export default async function AdminTournamentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const filters = { q: params.q?.trim() || undefined, status: params.status, format: params.format };
  const { tournaments, meta } = await listTournamentsForAdmin({ ...filters, page: parsePage(params.page) });
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Tournaments" description="Platform-wide tournament oversight." />
    <FilterBar basePath="/admin/tournaments" values={filters} fields={[{ name: "q", label: "Search", placeholder: "Name, location or organizer" }, { name: "status", label: "Status", options: options(["DRAFT", "OPEN_REGISTRATION", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"]) }, { name: "format", label: "Format", options: options(["SINGLE_ELIMINATION", "ROUND_ROBIN"]) }]} />
    <DataTable headers={["Tournament", "Organizer", "Status", "Format", "Starts", "Players", "Reports"]} empty={!tournaments.length}>
      {tournaments.map((tournament) => <tr key={tournament.id} className="hover:bg-slate-50">
        <Td><Link href={`/admin/tournaments/${tournament.id}`} className="font-medium hover:text-blue-700">{tournament.name}</Link>{tournament.winner && <p className="text-xs text-amber-700">Champion: {tournament.winner.name}</p>}</Td>
        <Td><Link href={`/admin/users/${tournament.createdBy.id}`} className="hover:text-blue-700">{tournament.createdBy.name}</Link></Td>
        <Td><StatusBadge value={tournament.status} /></Td>
        <Td>{tournament.format === "ROUND_ROBIN" ? "Round robin" : "Single elimination"}</Td>
        <Td>{formatDate(tournament.startDate, false)}</Td>
        <Td>{tournament._count.participants} / {tournament.maxParticipants}</Td>
        <Td>{tournament._count.reports || "—"}</Td>
      </tr>)}
    </DataTable>
    <Pagination meta={meta} basePath="/admin/tournaments" params={filters} />
  </AdminShell>;
}
