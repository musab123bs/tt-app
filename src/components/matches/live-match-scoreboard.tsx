"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  decidingGameEndsHaveChanged,
  getGameWinner,
  getMatchWinner,
  getPlayerSides,
  getServerId,
} from "@/lib/matches/scoring";
import type { MatchDetailView, MatchPlayer } from "@/lib/matches/types";

type LiveMatchScoreboardProps = {
  initialMatch: MatchDetailView;
};

const dateFormatter = new Intl.DateTimeFormat("en", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Asia/Karachi",
});

export function LiveMatchScoreboard({ initialMatch }: LiveMatchScoreboardProps) {
  const [match, setMatch] = useState(initialMatch);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const commandIds = useRef(new Map<string, string>());

  const currentGame = [...match.games].reverse().find((game) => game.status === "IN_PROGRESS");
  const displayedGame = currentGame ?? [...match.games].reverse()[0] ?? null;
  const pointHistory = currentGame?.points ?? displayedGame?.points ?? [];
  const sides = getPlayerSides(
    displayedGame?.number ?? 1,
    match.bestOf,
    pointHistory,
  );
  const currentServerId =
    currentGame && match.status === "IN_PROGRESS"
      ? getServerId(
          currentGame.firstServerId,
          match.player1.id,
          match.player2.id,
          currentGame.player1Score + currentGame.player2Score,
        )
      : null;
  const pendingGameWinner = currentGame
    ? getGameWinner(currentGame.player1Score, currentGame.player2Score)
    : null;
  const matchWinner = getMatchWinner(
    match.player1GamesWon,
    match.player2GamesWon,
    match.bestOf,
  );
  const canFinish = match.status === "IN_PROGRESS" && Boolean(matchWinner) && !currentGame;
  const endsChanged = decidingGameEndsHaveChanged(
    match.bestOf,
    displayedGame?.number ?? 1,
    pointHistory,
  );

  function getRequestId(key: string) {
    let requestId = commandIds.current.get(key);
    if (!requestId) {
      requestId = crypto.randomUUID();
      commandIds.current.set(key, requestId);
    }
    return requestId;
  }

  async function postCommand(
    action: string,
    body: Record<string, unknown>,
    endpoint = `/api/matches/${match.id}/score`,
  ) {
    const key = `${endpoint}:${action}:${String(body.playerId ?? "")}`;
    const requestId = getRequestId(key);
    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, requestId }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.match) {
        throw new Error(result?.error ?? `Unable to update the match (${response.status}).`);
      }
      setMatch(result.match as MatchDetailView);
      commandIds.current.delete(key);
      setMessage(action === "point" ? "Point recorded." : "Match updated.");
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "Unable to update the match.");
    } finally {
      setBusy(false);
    }
  }

  function abandonMatch() {
    if (!window.confirm("Abandon this match? Its partial score will not count as a completed result.")) {
      return;
    }
    void postCommand("abandon", {}, `/api/matches/${match.id}/abandon`);
  }

  const winner = match.winnerId === match.player1.id ? match.player1 : match.player2;

  return (
    <div className="space-y-5">
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-700">Singles · Best of {match.bestOf}</p>
            <h2 className="mt-2 text-xl font-semibold text-slate-900">
              {match.player1.name} <span className="font-normal text-slate-400">vs</span> {match.player2.name}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {dateFormatter.format(new Date(match.scheduledAt))}
              {match.location ? ` · ${match.location}` : ""}
            </p>
          </div>
          <StatusPill status={match.status} />
        </div>
        {match.notes && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">{match.notes}</p>}
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-7">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {displayedGame ? `Game ${displayedGame.number}` : "Ready to play"}
            </p>
            <p className="mt-1 text-sm font-medium text-slate-700">
              Match score <span className="font-bold tabular-nums">{match.player1GamesWon} – {match.player2GamesWon}</span>
            </p>
          </div>
          {currentServerId && (
            <div className="inline-flex items-center gap-2 rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800" aria-live="polite">
              <span className="h-2 w-2 rounded-full bg-amber-500" />
              Serving: {currentServerId === match.player1.id ? match.player1.name : match.player2.name}
            </div>
          )}
          {endsChanged && <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700">Ends changed at 5</span>}
        </div>

        <div className="grid gap-3 p-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch sm:gap-4 sm:p-6">
          <ScorePlayer
            player={match.player1}
            score={displayedGame?.player1Score ?? 0}
            gameWins={match.player1GamesWon}
            side={sides.player1}
            serving={currentServerId === match.player1.id}
            leading={Boolean(displayedGame && displayedGame.player1Score > displayedGame.player2Score)}
            awardedGame={displayedGame?.winnerId === match.player1.id}
          />
          <div className="flex items-center justify-center py-1 text-sm font-semibold uppercase tracking-widest text-slate-300 sm:px-1">vs</div>
          <ScorePlayer
            player={match.player2}
            score={displayedGame?.player2Score ?? 0}
            gameWins={match.player2GamesWon}
            side={sides.player2}
            serving={currentServerId === match.player2.id}
            leading={Boolean(displayedGame && displayedGame.player2Score > displayedGame.player1Score)}
            awardedGame={displayedGame?.winnerId === match.player2.id}
          />
        </div>

        {match.status === "SCHEDULED" && (
          <div className="border-t border-slate-100 px-4 py-5 text-center sm:px-6">
            <p className="mb-3 text-sm text-slate-600">Start when both players are ready. Player 1 serves first.</p>
            <Button disabled={busy} onClick={() => void postCommand("start", {}, `/api/matches/${match.id}/start`)}>
              {busy ? "Starting…" : "Start match"}
            </Button>
          </div>
        )}

        {currentGame && match.status === "IN_PROGRESS" && !pendingGameWinner && (
          <div className="grid gap-3 border-t border-slate-100 p-4 sm:grid-cols-2 sm:p-6">
            <Button className="min-h-14 text-base" disabled={busy} onClick={() => void postCommand("point", { playerId: match.player1.id })}>
              +1 point · {match.player1.name}
            </Button>
            <Button className="min-h-14 bg-slate-800 text-base hover:bg-slate-700" disabled={busy} onClick={() => void postCommand("point", { playerId: match.player2.id })}>
              +1 point · {match.player2.name}
            </Button>
            <div className="flex flex-wrap items-center justify-center gap-3 sm:col-span-2">
              <Button
                variant="secondary"
                disabled={busy || !currentGame.points.some((point) => point.action === "POINT" && !point.undoneAt)}
                onClick={() => void postCommand("undo", {})}
              >
                Undo last point
              </Button>
              <button type="button" disabled={busy} onClick={abandonMatch} className="rounded-full px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
                Abandon match
              </button>
            </div>
          </div>
        )}

        {currentGame && pendingGameWinner && match.status === "IN_PROGRESS" && (
          <div className="border-t border-emerald-100 bg-emerald-50/70 px-4 py-5 text-center sm:px-6">
            <p className="font-semibold text-emerald-900">
              Game point: {pendingGameWinner === 1 ? match.player1.name : match.player2.name} has won this game.
            </p>
            <Button className="mt-3" disabled={busy} onClick={() => void postCommand("confirm_game", {})}>
              {busy ? "Confirming…" : "Confirm game completion"}
            </Button>
          </div>
        )}

        {canFinish && (
          <div className="border-t border-emerald-100 bg-emerald-50/70 px-4 py-5 text-center sm:px-6">
            <p className="font-semibold text-emerald-900">
              {matchWinner === 1 ? match.player1.name : match.player2.name} has won the match.
            </p>
            <Button className="mt-3" disabled={busy} onClick={() => void postCommand("finish", {})}>
              {busy ? "Saving result…" : "Finish match"}
            </Button>
          </div>
        )}

        {match.status === "COMPLETED" && (
          <div className="border-t border-emerald-100 bg-emerald-50 px-4 py-5 text-center sm:px-6">
            <p className="font-semibold text-emerald-900">{winner.name} won this match.</p>
            <p className="mt-1 text-sm text-emerald-800">
              Final match score {match.player1GamesWon}–{match.player2GamesWon} · {match.player1TotalPoints}–{match.player2TotalPoints} total points
            </p>
          </div>
        )}

        {match.status === "ABANDONED" && (
          <div className="border-t border-slate-100 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600 sm:px-6">
            This match was abandoned. Its partial score is excluded from player statistics.
          </div>
        )}

        {error && <p role="alert" className="mx-4 mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700 sm:mx-6">{error}</p>}
        {message && !error && <p role="status" className="mx-4 mb-4 text-center text-sm text-emerald-700 sm:mx-6">{message}</p>}
      </Card>

      <Card className="p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Scorecard and point history</h2>
            <p className="mt-1 text-sm text-slate-500">Point edits and undo actions are saved as an auditable history.</p>
          </div>
          {match.status !== "COMPLETED" && match.status !== "ABANDONED" && (match.status === "SCHEDULED" || currentGame) && (
            <button type="button" disabled={busy} onClick={abandonMatch} className="rounded-full px-3 py-2 text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50">
              Abandon match
            </button>
          )}
        </div>

        {match.games.length === 0 ? (
          <p className="mt-5 rounded-xl border border-dashed border-slate-200 bg-slate-50 p-5 text-center text-sm text-slate-500">The scorecard will appear once the match starts.</p>
        ) : (
          <div className="mt-5 space-y-3">
            {match.games.map((game) => (
              <details key={game.id} open={game.status === "IN_PROGRESS" || game === match.games.at(-1)} className="rounded-xl border border-slate-200">
                <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold text-slate-800">
                  Game {game.number}: {game.player1Score}–{game.player2Score}
                  {game.winnerId ? ` · ${game.winnerId === match.player1.id ? match.player1.name : match.player2.name} won` : " · In progress"}
                </summary>
                <div className="border-t border-slate-100 px-4 py-3">
                  {game.points.length === 0 ? (
                    <p className="text-sm text-slate-500">No points recorded yet.</p>
                  ) : (
                    <ol className="max-h-72 space-y-2 overflow-y-auto text-sm">
                      {[...game.points].reverse().map((point) => (
                        <li key={point.id} className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 rounded-lg px-3 py-2 ${point.action === "UNDO" ? "bg-amber-50 text-amber-900" : point.undoneAt ? "bg-slate-50 text-slate-400 line-through" : "bg-slate-50 text-slate-700"}`}>
                          <span>
                            {point.action === "UNDO"
                              ? `${point.actorName} undid a point`
                              : `${point.playerAwardedName ?? "A player"} scored${point.serverId ? ` · server ${point.serverId === match.player1.id ? match.player1.name : match.player2.name}` : ""}`}
                            {point.undoneAt ? " · undone" : ""}
                          </span>
                          <span className="font-semibold tabular-nums">{point.scorePlayer1}–{point.scorePlayer2}</span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </Card>

      <div className="flex justify-end">
        <Link href="/matches" className="rounded-full px-4 py-2 text-sm font-medium text-slate-600 hover:bg-white hover:text-slate-900">Back to match history</Link>
      </div>
    </div>
  );
}

function ScorePlayer({
  player,
  score,
  gameWins,
  side,
  serving,
  leading,
  awardedGame,
}: {
  player: MatchPlayer;
  score: number;
  gameWins: number;
  side: "left" | "right";
  serving: boolean;
  leading: boolean;
  awardedGame: boolean;
}) {
  return (
    <div className={`relative flex min-h-56 flex-col items-center justify-center rounded-2xl border p-5 text-center sm:min-h-72 ${awardedGame ? "border-emerald-300 bg-emerald-50" : leading ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-slate-50"}`}>
      <div className="absolute left-3 top-3 rounded-full bg-white/80 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-slate-500">{side} end</div>
      {serving && <div className="absolute right-3 top-3 rounded-full bg-amber-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-amber-900">Serving</div>}
      <Avatar player={player} />
      <p className="mt-3 max-w-full truncate text-base font-semibold text-slate-900 sm:text-lg">{player.name}</p>
      <p className="mt-1 text-xs font-medium text-slate-500">{gameWins} {gameWins === 1 ? "game" : "games"} won</p>
      <p className={`mt-2 text-6xl font-bold tabular-nums tracking-tight sm:text-7xl ${leading ? "text-[#0B82FF]" : "text-slate-900"}`} aria-label={`${player.name} score ${score}`}>
        {score}
      </p>
    </div>
  );
}

function Avatar({ player }: { player: MatchPlayer }) {
  return player.image ? (
    <Image src={player.image} alt="" width={56} height={56} unoptimized className="h-14 w-14 rounded-full border border-white object-cover shadow-sm" />
  ) : (
    <div aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full border border-white bg-blue-100 text-lg font-semibold text-blue-700 shadow-sm">
      {player.name.trim().slice(0, 1).toUpperCase() || "P"}
    </div>
  );
}

function StatusPill({ status }: { status: MatchDetailView["status"] }) {
  const classes = {
    SCHEDULED: "bg-blue-50 text-blue-700",
    IN_PROGRESS: "bg-amber-50 text-amber-800",
    COMPLETED: "bg-emerald-50 text-emerald-800",
    ABANDONED: "bg-slate-100 text-slate-600",
  }[status];
  const label = status === "IN_PROGRESS" ? "In progress" : status[0] + status.slice(1).toLowerCase();
  return <span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${classes}`}>{label}</span>;
}
