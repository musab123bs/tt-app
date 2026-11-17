"use client";

import { useState, type FormEvent } from "react";

import { Avatar, formatDate, MetricCard } from "@/components/analytics/analytics-panels";
import { Card } from "@/components/ui/card";

type PlayerOption = { id: string; name: string; image: string | null; level: string | null };
type Comparison = {
  playerA: PlayerOption;
  playerB: PlayerOption;
  played: number;
  playerAWins: number;
  playerBWins: number;
  playerAGamesWon: number;
  playerBGamesWon: number;
  playerAPointsScored: number;
  playerBPointsScored: number;
  mostRecentAt: string | null;
  recentResults: Array<{ id: string; completedAt: string; winnerId: string; score: string }>;
};

export function PlayerComparison({ playerA, initialPlayerB, initialComparison }: {
  playerA: PlayerOption;
  initialPlayerB: PlayerOption | null;
  initialComparison: Comparison | null;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PlayerOption[]>([]);
  const [comparison, setComparison] = useState<Comparison | null>(initialComparison);
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerOption | null>(initialPlayerB);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function searchPlayers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (query.trim().length < 2) {
      setError("Enter at least two characters to search.");
      return;
    }
    setLoading(true);
    setError("");
    setResults([]);
    try {
      const response = await fetch(`/api/analytics/players?q=${encodeURIComponent(query.trim())}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Player search failed.");
      setResults((result.players ?? []).filter((player: PlayerOption) => player.id !== playerA.id));
      if (!(result.players ?? []).length) setError("No public players found for that search.");
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Player search failed.");
    } finally {
      setLoading(false);
    }
  }

  async function choosePlayer(player: PlayerOption) {
    setSelectedPlayer(player);
    setResults([]);
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/analytics/compare?playerA=${encodeURIComponent(playerA.id)}&playerB=${encodeURIComponent(player.id)}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "Comparison is unavailable.");
      setComparison(result.comparison);
    } catch (failure) {
      setComparison(null);
      setError(failure instanceof Error ? failure.message : "Comparison is unavailable.");
    } finally {
      setLoading(false);
    }
  }

  return <div className="space-y-5">
    <Card>
      <form onSubmit={searchPlayers} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="comparison-player-search" className="sr-only">Search for a player to compare</label>
        <input id="comparison-player-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search public players by name" className="min-w-0 flex-1 rounded-xl border border-slate-200 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        <button type="submit" disabled={loading} className="rounded-xl bg-[#0B82FF] px-5 py-3 text-sm font-semibold text-white disabled:opacity-60">{loading ? "Loading…" : "Search players"}</button>
      </form>
      {selectedPlayer && <p className="mt-3 text-sm text-slate-500">Comparing {playerA.name} with {selectedPlayer.name}</p>}
      {error && <p role="alert" className="mt-3 text-sm text-rose-700">{error}</p>}
      {results.length > 0 && <ul className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-100">{results.map((player) => <li key={player.id}><button type="button" onClick={() => void choosePlayer(player)} className="flex w-full items-center gap-3 p-3 text-left hover:bg-slate-50"><Avatar name={player.name} image={player.image} size={40} /><span className="font-medium text-slate-900">{player.name}</span><span className="ml-auto text-sm text-slate-500">{player.level?.toLowerCase() ?? "Player"}</span></button></li>)}</ul>}
    </Card>
    {loading && <div role="status" className="rounded-2xl bg-white p-8 text-center text-sm text-slate-500">Loading head-to-head records…</div>}
    {!loading && comparison && <ComparisonResults data={comparison} />}
    {!loading && !comparison && !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Search for a public registered player to compare completed matches.</div>}
  </div>;
}

function ComparisonResults({ data }: { data: Comparison }) {
  const aWinRate = data.played ? Math.round((data.playerAWins / data.played) * 1000) / 10 : 0;
  const bWinRate = data.played ? Math.round((data.playerBWins / data.played) * 1000) / 10 : 0;
  return <>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label="Head-to-head matches" value={data.played} />
      <MetricCard label={`${data.playerA.name} wins`} value={data.playerAWins} hint={`${aWinRate}% of encounters`} />
      <MetricCard label={`${data.playerB.name} wins`} value={data.playerBWins} hint={`${bWinRate}% of encounters`} />
      <MetricCard label="Most recent encounter" value={data.mostRecentAt ? formatDate(data.mostRecentAt) : "None yet"} />
    </div>
    <Card>
      <h2 className="font-semibold text-slate-900">Head-to-head performance</h2>
      <div className="mt-5 space-y-5">
        <ComparisonBar label="Games won" aValue={data.playerAGamesWon} bValue={data.playerBGamesWon} aName={data.playerA.name} bName={data.playerB.name} />
        <ComparisonBar label="Points scored" aValue={data.playerAPointsScored} bValue={data.playerBPointsScored} aName={data.playerA.name} bName={data.playerB.name} />
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2"><PlayerTile player={data.playerA} /><PlayerTile player={data.playerB} /></div>
      <div className="mt-4 grid gap-2 text-xs text-slate-500 sm:grid-cols-2">
        <p>{data.playerA.name}: {data.playerAGamesWon} games won / {data.playerBGamesWon} lost; {data.playerAPointsScored} points scored / {data.playerBPointsScored} conceded.</p>
        <p>{data.playerB.name}: {data.playerBGamesWon} games won / {data.playerAGamesWon} lost; {data.playerBPointsScored} points scored / {data.playerAPointsScored} conceded.</p>
      </div>
    </Card>
    <Card>
      <h2 className="font-semibold text-slate-900">Recent encounters</h2>
      <p className="mt-1 text-xs text-slate-500">Scores are shown in {data.playerA.name}–{data.playerB.name} order.</p>
      {data.recentResults.length ? <ul className="mt-3 divide-y divide-slate-100">{data.recentResults.map((match) => <li key={match.id} className="flex items-center justify-between gap-4 py-3"><span className="text-sm text-slate-600">{formatDate(match.completedAt)}</span><span className="text-sm font-medium text-slate-900">{match.winnerId === data.playerA.id ? data.playerA.name : data.playerB.name} won</span><span className="tabular-nums text-sm font-semibold text-slate-900">{match.score}</span></li>)}</ul> : <p className="py-7 text-center text-sm text-slate-500">These players have no completed matches against each other yet.</p>}
    </Card>
  </>;
}

function ComparisonBar({ label, aValue, bValue, aName, bName }: { label: string; aValue: number; bValue: number; aName: string; bName: string }) {
  const total = aValue + bValue;
  const aPercent = total ? (aValue / total) * 100 : 50;
  return <div><div className="mb-2 flex justify-between gap-3 text-sm"><span className="font-medium text-slate-700">{label}</span><span className="tabular-nums text-slate-500">{aName} {aValue} · {bName} {bValue}</span></div><div className="flex h-3 overflow-hidden rounded-full bg-rose-100" role="img" aria-label={`${label}: ${aName} ${aValue}, ${bName} ${bValue}`}><div className="bg-[#0B82FF] transition-all" style={{ width: `${aPercent}%` }} /></div></div>;
}

function PlayerTile({ player }: { player: PlayerOption }) {
  return <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3"><Avatar name={player.name} image={player.image} size={40} /><div><p className="font-medium text-slate-900">{player.name}</p><p className="text-xs capitalize text-slate-500">{player.level?.toLowerCase() ?? "Player"}</p></div></div>;
}
