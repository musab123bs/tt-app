"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TournamentActions({ tournamentId, status, mine, isOrganizer, canRegister, canWithdraw, hasDraw }: { tournamentId: string; status: string; mine: string | null; isOrganizer: boolean; canRegister: boolean; canWithdraw: boolean; hasDraw: boolean }) {
  const router = useRouter(); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  async function act(path: string, body: unknown, method = "POST") {
    setBusy(true); setError("");
    const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const result = await response.json();
    if (!response.ok) setError(result.error ?? "Action failed."); else router.refresh();
    setBusy(false);
  }
  return <div className="flex flex-wrap items-center gap-2">
    {canRegister && <button disabled={busy} onClick={() => act(`/api/tournaments/${tournamentId}/participants`, { action: "REGISTER" })} className="rounded-full bg-[#0B82FF] px-4 py-2 text-sm font-medium text-white">Register</button>}
    {canWithdraw && <button disabled={busy} onClick={() => act(`/api/tournaments/${tournamentId}/participants`, { action: "WITHDRAW" })} className="rounded-full border border-slate-300 px-4 py-2 text-sm">Cancel registration</button>}
    {isOrganizer && status === "OPEN_REGISTRATION" && <button disabled={busy} onClick={() => act(`/api/tournaments/${tournamentId}/participants`, { action: "CLOSE_REGISTRATION" })} className="rounded-full border border-slate-300 px-4 py-2 text-sm">Close registration</button>}
    {isOrganizer && status === "REGISTRATION_CLOSED" && !hasDraw && <button disabled={busy} onClick={() => act(`/api/tournaments/${tournamentId}/draw`, {})} className="rounded-full bg-[#0B82FF] px-4 py-2 text-sm font-medium text-white">Generate draw</button>}
    {isOrganizer && !["COMPLETED", "CANCELLED"].includes(status) && <button disabled={busy} onClick={() => { if (confirm("Cancel this tournament and its unfinished matches?")) void act(`/api/tournaments/${tournamentId}`, { status: "CANCELLED" }, "PATCH"); }} className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700">Cancel tournament</button>}
    {mine && <span className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-600">Your registration: {mine.replaceAll("_", " ").toLowerCase()}</span>}
    {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}
  </div>;
}
