import type { TournamentStanding } from "@/lib/tournaments/formats";

export function TournamentStandings({ standings }: { standings: TournamentStanding[] }) {
  if (!standings.length) return <p className="mt-3 text-sm text-slate-500">Standings appear once fixtures are generated.</p>;
  return <div className="mt-4 overflow-x-auto">
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500">
        <tr>{["#", "Player", "P", "W", "L", "GW", "GL", "PS", "PC", "PD"].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-2 py-2 font-medium">{heading}</th>)}</tr>
      </thead>
      <tbody className="divide-y divide-slate-100">
        {standings.map((row) => <tr key={row.playerId} className={row.position === 1 ? "bg-amber-50/60" : undefined}>
          <td className="px-2 py-2.5 font-semibold">{row.position}</td>
          <td className="px-2 py-2.5"><div className="flex items-center gap-2">{row.image
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={row.image} alt="" className="h-7 w-7 rounded-full object-cover" />
            : <span aria-hidden="true" className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700">{row.name.slice(0, 1).toUpperCase()}</span>}<span className="whitespace-nowrap font-medium">{row.name}</span></div></td>
          <td className="px-2 py-2.5">{row.matchesPlayed}</td>
          <td className="px-2 py-2.5">{row.matchesWon}</td>
          <td className="px-2 py-2.5">{row.matchesLost}</td>
          <td className="px-2 py-2.5">{row.gamesWon}</td>
          <td className="px-2 py-2.5">{row.gamesLost}</td>
          <td className="px-2 py-2.5">{row.pointsScored}</td>
          <td className="px-2 py-2.5">{row.pointsConceded}</td>
          <td className="px-2 py-2.5">{row.pointsDifference > 0 ? `+${row.pointsDifference}` : row.pointsDifference}</td>
        </tr>)}
      </tbody>
    </table>
    <p className="mt-3 text-xs text-slate-500">P played · W won · L lost · GW/GL games won/lost · PS/PC points scored/conceded · PD point difference</p>
  </div>;
}
