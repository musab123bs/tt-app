"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { MatchPlayer } from "@/lib/matches/types";

type MatchCreateFormProps = {
  playerName: string;
  playerImage: string | null;
};

function getLocalDateTimeValue() {
  const localDate = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

export function MatchCreateForm({ playerName, playerImage }: MatchCreateFormProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [players, setPlayers] = useState<MatchPlayer[]>([]);
  const [selectedOpponent, setSelectedOpponent] = useState<MatchPlayer | null>(null);
  const [bestOf, setBestOf] = useState<3 | 5 | 7>(5);
  const [scheduledAt, setScheduledAt] = useState(getLocalDateTimeValue);
  const [location, setLocation] = useState("");
  const [notes, setNotes] = useState("");
  const [searching, setSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [searchError, setSearchError] = useState("");
  const requestId = useRef<string | null>(null);

  useEffect(() => {
    const normalizedQuery = query.trim();
    if (selectedOpponent || normalizedQuery.length < 2) {
      const timeout = window.setTimeout(() => {
        setPlayers([]);
        setSearching(false);
        setSearchError("");
      }, 0);
      return () => window.clearTimeout(timeout);
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setSearching(true);
      setSearchError("");
      try {
        const response = await fetch(`/api/matches/opponents?q=${encodeURIComponent(normalizedQuery)}`, {
          signal: controller.signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error ?? "Player search is unavailable.");
        setPlayers(result.players ?? []);
      } catch (searchFailure) {
        if (!controller.signal.aborted) {
          setPlayers([]);
          setSearchError(
            searchFailure instanceof Error ? searchFailure.message : "Player search is unavailable.",
          );
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [query, selectedOpponent]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selectedOpponent) {
      setError("Search for and select a registered opponent first.");
      return;
    }
    if (!scheduledAt || Number.isNaN(new Date(scheduledAt).getTime())) {
      setError("Choose a valid match date and time.");
      return;
    }

    setSaving(true);
    setError("");
    requestId.current ??= crypto.randomUUID();

    try {
      const response = await fetch("/api/matches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          requestId: requestId.current,
          opponentId: selectedOpponent.id,
          matchType: "SINGLES",
          bestOf,
          scheduledAt: new Date(scheduledAt).toISOString(),
          location,
          notes,
        }),
      });
      const result = await response.json().catch(() => null);
      if (!response.ok || !result?.match?.id) {
        throw new Error(result?.error ?? `Unable to create the match (${response.status}).`);
      }
      router.push(`/matches/${result.match.id}`);
    } catch (saveFailure) {
      setError(saveFailure instanceof Error ? saveFailure.message : "Unable to create the match.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Players</h2>
          <p className="mt-1 text-sm text-slate-500">You will be Player 1. Choose a registered opponent.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <PlayerCard name={playerName} image={playerImage} label="Player 1 · You" />
          <div className="relative">
            <label htmlFor="opponent-search" className="mb-2 block text-sm font-medium text-slate-700">
              Search opponent
            </label>
            {selectedOpponent ? (
              <div className="flex min-h-[76px] items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-3">
                <PlayerCard name={selectedOpponent.name} image={selectedOpponent.image} label="Player 2" compact />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedOpponent(null);
                    setQuery("");
                  }}
                  className="shrink-0 rounded-lg px-2 py-1 text-sm font-medium text-blue-700 hover:bg-white"
                >
                  Change
                </button>
              </div>
            ) : (
              <>
                <input
                  id="opponent-search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  autoComplete="off"
                  placeholder="Type at least 2 characters"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-[#0B82FF] focus:ring-2 focus:ring-blue-100"
                />
                {searching && <p className="mt-2 text-xs text-slate-500">Searching players…</p>}
                {searchError && <p className="mt-2 text-xs text-red-700">{searchError}</p>}
                {!searching && query.trim().length >= 2 && !searchError && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-2 max-h-64 overflow-y-auto rounded-xl border border-slate-200 bg-white p-1 shadow-xl">
                    {players.length === 0 ? (
                      <p className="p-3 text-sm text-slate-500">No public registered players found.</p>
                    ) : (
                      players.map((player) => (
                        <button
                          key={player.id}
                          type="button"
                          onClick={() => setSelectedOpponent(player)}
                          className="w-full rounded-lg p-2 text-left hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B82FF]"
                        >
                          <PlayerCard name={player.name} image={player.image} label="Player" compact />
                        </button>
                      ))
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </Card>

      <Card className="space-y-5 p-5 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Match details</h2>
          <p className="mt-1 text-sm text-slate-500">Match format is Singles.</p>
        </div>

        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700">Match format</legend>
          <div className="grid grid-cols-3 gap-2">
            {([3, 5, 7] as const).map((format) => (
              <button
                key={format}
                type="button"
                aria-pressed={bestOf === format}
                onClick={() => setBestOf(format)}
                className={`rounded-xl border px-3 py-3 text-sm font-semibold transition ${bestOf === format ? "border-blue-500 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
              >
                Best of {format}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Match date and time</span>
            <input
              type="datetime-local"
              required
              value={scheduledAt}
              onChange={(event) => setScheduledAt(event.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-[#0B82FF]"
            />
          </label>
          <label className="space-y-2">
            <span className="text-sm font-medium text-slate-700">Location <span className="font-normal text-slate-400">(optional)</span></span>
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              maxLength={160}
              placeholder="Club or venue"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-[#0B82FF]"
            />
          </label>
        </div>

        <label className="block space-y-2">
          <span className="text-sm font-medium text-slate-700">Notes <span className="font-normal text-slate-400">(optional)</span></span>
          <textarea
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
            maxLength={1000}
            rows={3}
            placeholder="Anything the players should know?"
            className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-[#0B82FF]"
          />
        </label>

        {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        <div className="flex justify-end">
          <Button type="submit" disabled={saving || !selectedOpponent}>
            {saving ? "Creating match…" : "Create match"}
          </Button>
        </div>
      </Card>
    </form>
  );
}

function PlayerCard({
  name,
  image,
  label,
  compact = false,
}: {
  name: string;
  image: string | null;
  label: string;
  compact?: boolean;
}) {
  return (
    <div className={`flex min-w-0 items-center gap-3 ${compact ? "" : "min-h-[76px] rounded-xl border border-slate-200 bg-slate-50 p-3"}`}>
      {image ? (
        <Image src={image} alt="" width={compact ? 40 : 44} height={compact ? 40 : 44} unoptimized className="h-10 w-10 shrink-0 rounded-full object-cover" />
      ) : (
        <div aria-hidden="true" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-sm font-semibold text-blue-700">
          {name.trim().slice(0, 1).toUpperCase() || "P"}
        </div>
      )}
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-900">{name}</p>
      </div>
    </div>
  );
}
