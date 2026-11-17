import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, FilterBar, Pagination, StatusBadge, Td, formatDate, options } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { parsePage } from "@/lib/admin/pagination";
import { listMatches, MATCH_STATUSES } from "@/lib/services/admin/matches";

export const instant = false;
const name = (player: { name: string; playerProfile: { fullName: string } | null }) => player.playerProfile?.fullName || player.name;

export default async function AdminMatchesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const admin = await requireSuperAdmin();
  const params = await searchParams;
  const filters = { q: params.q?.trim() || undefined, status: params.status, from: params.from, to: params.to, review: params.review };
  const { matches, meta } = await listMatches({ ...filters, page: parsePage(params.page) });
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Matches" description="Review, moderate and correct match results." />
    <FilterBar basePath="/admin/matches" values={filters} fields={[{ name: "q", label: "Player", placeholder: "Name or email" }, { name: "status", label: "Status", options: options(MATCH_STATUSES) }, { name: "review", label: "Review", options: [["UNDER_REVIEW", "Under review"]] }, { name: "from", label: "From", type: "date" }, { name: "to", label: "To", type: "date" }]} />
    <DataTable headers={["Match", "Score", "Status", "Scheduled", "Tournament", "Flags"]} empty={!matches.length}>
      {matches.map((match) => <tr key={match.id} className="hover:bg-slate-50">
        <Td><Link href={`/admin/matches/${match.id}`} className="font-medium hover:text-blue-700">{name(match.player1)} vs {name(match.player2)}</Link><p className="text-xs text-slate-500">Best of {match.bestOf}</p></Td>
        <Td>{match.player1GamesWon}–{match.player2GamesWon}</Td>
        <Td><StatusBadge value={match.status} />{match.reviewStatus === "UNDER_REVIEW" && <span className="ml-1"><StatusBadge value="UNDER_REVIEW" /></span>}</Td>
        <Td>{formatDate(match.scheduledAt)}</Td>
        <Td>{match.tournamentFixture ? <Link href={`/admin/tournaments/${match.tournamentFixture.tournament.id}`} className="text-blue-700">{match.tournamentFixture.tournament.name}</Link> : "—"}</Td>
        <Td className="text-xs text-slate-500">{match._count.reports ? `${match._count.reports} report(s)` : ""}{match._count.corrections ? ` ${match._count.corrections} correction(s)` : ""}</Td>
      </tr>)}
    </DataTable>
    <Pagination meta={meta} basePath="/admin/matches" params={filters} />
  </AdminShell>;
}
