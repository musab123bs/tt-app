"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const TYPES = [
  ["INCORRECT_RESULT", "Incorrect match result"],
  ["SUSPICIOUS_ACTIVITY", "Suspicious match activity"],
  ["INAPPROPRIATE_PROFILE", "Inappropriate player profile"],
  ["TOURNAMENT_DISPUTE", "Tournament dispute"],
  ["OTHER", "Other platform issue"],
] as const;

type Option = { id: string; label: string };
const input = "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm";

export function ReportForm({ initial, matches, tournaments, players }: { initial: { type?: string; matchId?: string; tournamentId?: string; userId?: string }; matches: Option[]; tournaments: Option[]; players: Option[] }) {
  const router = useRouter();
  const [type, setType] = useState(TYPES.some(([value]) => value === initial.type) ? initial.type! : "INCORRECT_RESULT");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const needsMatch = type === "INCORRECT_RESULT" || type === "SUSPICIOUS_ACTIVITY";

  return <form className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5" onSubmit={async (event) => {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    const body = { type, description: data.description, ...(data.matchId ? { matchId: data.matchId } : {}), ...(data.tournamentId ? { tournamentId: data.tournamentId } : {}), ...(data.targetUserId ? { targetUserId: data.targetUserId } : {}) };
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setMessage({ ok: false, text: result.error ?? "Could not submit the report." });
      else { setMessage({ ok: true, text: "Report submitted. An administrator will review it." }); (event.target as HTMLFormElement).reset(); router.refresh(); }
    } catch { setMessage({ ok: false, text: "Network error. Try again." }); } finally { setBusy(false); }
  }}>
    <label className="block text-sm font-medium">What are you reporting?<select value={type} onChange={(event) => setType(event.target.value)} className={input}>{TYPES.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>
    {needsMatch && <label className="block text-sm font-medium">Match<select name="matchId" required defaultValue={initial.matchId ?? ""} className={input}><option value="">Choose a match</option>{matches.map((match) => <option key={match.id} value={match.id}>{match.label}</option>)}</select></label>}
    {(type === "TOURNAMENT_DISPUTE" || type === "OTHER") && <label className="block text-sm font-medium">Tournament{type === "OTHER" ? " (optional)" : ""}<select name="tournamentId" required={type === "TOURNAMENT_DISPUTE"} defaultValue={initial.tournamentId ?? ""} className={input}><option value="">Choose a tournament</option>{tournaments.map((tournament) => <option key={tournament.id} value={tournament.id}>{tournament.label}</option>)}</select></label>}
    {type === "INAPPROPRIATE_PROFILE" && <label className="block text-sm font-medium">Player<select name="targetUserId" required defaultValue={initial.userId ?? ""} className={input}><option value="">Choose a player</option>{players.map((player) => <option key={player.id} value={player.id}>{player.label}</option>)}</select></label>}
    <label className="block text-sm font-medium">Details<textarea name="description" required minLength={10} maxLength={2000} rows={5} placeholder="Explain what happened and what should be corrected." className={input} /></label>
    {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
    <button disabled={busy} className="rounded-full bg-[#0B82FF] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Submitting…" : "Submit report"}</button>
  </form>;
}
