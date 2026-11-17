import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, FilterBar, Pagination, StatusBadge, Td, options } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { parsePage } from "@/lib/admin/pagination";
import { listPlayers } from "@/lib/services/admin/players";
import { PLAYER_LEVELS } from "@/lib/services/platform-settings";

export const instant = false;

export default async function AdminPlayersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const filters = { q: params.q?.trim() || undefined, level: params.level };
  const { players, meta } = await listPlayers({ ...filters, page: parsePage(params.page) });
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Players" description="Player profiles, statistics and participation." />
    <FilterBar basePath="/admin/players" values={filters} fields={[{ name: "q", label: "Search", placeholder: "Name, email or club" }, { name: "level", label: "Level", options: options(PLAYER_LEVELS) }]} />
    <DataTable headers={["Player", "Level", "Visibility", "Account", "Matches", "Won", "Tournaments"]} empty={!players.length}>
      {players.map((player) => <tr key={player.id} className="hover:bg-slate-50">
        <Td><div className="flex items-center gap-3">{player.image
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={player.image} alt="" className="h-8 w-8 rounded-full object-cover" />
          : <span aria-hidden="true" className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{player.name.slice(0, 1).toUpperCase()}</span>}<div><Link href={`/admin/players/${player.id}`} className="font-medium hover:text-blue-700">{player.name}</Link><p className="text-xs text-slate-500">{player.email}</p></div></div></Td>
        <Td>{player.level.toLowerCase()}</Td>
        <Td>{player.isPublic ? "Public" : "Private"}</Td>
        <Td><StatusBadge value={player.status} /></Td>
        <Td>{player.played}</Td>
        <Td>{player.won}</Td>
        <Td>{player.tournaments}</Td>
      </tr>)}
    </DataTable>
    <Pagination meta={meta} basePath="/admin/players" params={filters} />
  </AdminShell>;
}
