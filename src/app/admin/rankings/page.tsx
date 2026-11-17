import Link from "next/link";

import { AdminShell } from "@/components/admin/admin-shell";
import { AdminHeader, DataTable, Td } from "@/components/admin/ui";
import { requireSuperAdmin } from "@/lib/admin/auth";
import { getPlayerLeaderboard } from "@/lib/services/analytics";
import { getPlatformSettings } from "@/lib/services/platform-settings";

export const instant = false;

export default async function AdminRankingsPage() {
  const admin = await requireSuperAdmin();
  const [leaderboard, settings] = await Promise.all([getPlayerLeaderboard("overall"), getPlatformSettings()]);
  return <AdminShell adminName={admin.name}>
    <AdminHeader title="Rankings" description={`All-time leaderboard. Players need ${settings.ranking.minCompletedMatches} completed matches to be ranked.`} action={<Link href="/admin/settings#ranking" className="rounded-full border border-slate-300 bg-white px-3.5 py-2 text-sm">Ranking settings</Link>} />
    <DataTable headers={["Rank", "Player", "Played", "Won", "Win %", "Eligible"]} empty={!leaderboard.players.length}>
      {leaderboard.players.slice(0, 100).map((player) => <tr key={player.id}>
        <Td className="font-semibold">{player.eligible ? player.rank : "—"}</Td>
        <Td><Link href={`/admin/players/${player.id}`} className="hover:text-blue-700">{player.name}</Link></Td>
        <Td>{player.played}</Td>
        <Td>{player.won}</Td>
        <Td>{player.winPercentage}%</Td>
        <Td>{player.eligible ? "Yes" : `Needs ${settings.ranking.minCompletedMatches - player.played} more`}</Td>
      </tr>)}
    </DataTable>
  </AdminShell>;
}
