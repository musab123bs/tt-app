"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Props = {
  tournamentId: string;
  status: string;
  mine: string | null;
  isOrganizer: boolean;
  canRegister: boolean;
  canWithdraw: boolean;
  hasDraw: boolean;
  canDelete: boolean;
};

export function TournamentActions({ tournamentId, status, mine, isOrganizer, canRegister, canWithdraw, hasDraw, canDelete }: Props) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function act(path: string, body: unknown, method = "POST", after?: () => void) {
    setBusy(true);
    setError("");
    try {
      const response = await fetch(path, { method, headers: { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setError(result.error ?? "Action failed.");
      else if (after) after();
      else router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  const participants = `/api/tournaments/${tournamentId}/participants`;
  const secondary = "rounded-full border border-slate-300 px-4 py-2 text-sm disabled:opacity-60";
  const primary = "rounded-full bg-[#0B82FF] px-4 py-2 text-sm font-medium text-white disabled:opacity-60";

  return <div className="flex flex-wrap items-center gap-2">
    {canRegister && <button disabled={busy} onClick={() => act(participants, { action: "REGISTER" })} className={primary}>Register</button>}
    {canWithdraw && <button disabled={busy} onClick={() => { if (confirm("Cancel your registration?")) void act(participants, { action: "WITHDRAW" }); }} className={secondary}>Cancel registration</button>}
    {isOrganizer && ["DRAFT", "OPEN_REGISTRATION"].includes(status) && !hasDraw && <Link href={`/tournaments/${tournamentId}/edit`} className={secondary}>Edit</Link>}
    {isOrganizer && status === "DRAFT" && <button disabled={busy} onClick={() => act(`/api/tournaments/${tournamentId}`, { status: "OPEN_REGISTRATION" }, "PATCH")} className={primary}>Open registration</button>}
    {isOrganizer && status === "OPEN_REGISTRATION" && <button disabled={busy} onClick={() => { if (confirm("Close registration now? Players will no longer be able to register.")) void act(participants, { action: "CLOSE_REGISTRATION" }); }} className={secondary}>Close registration</button>}
    {isOrganizer && status === "REGISTRATION_CLOSED" && !hasDraw && <button disabled={busy} onClick={() => { if (confirm("Generate the draw? Fixtures cannot be regenerated afterwards.")) void act(`/api/tournaments/${tournamentId}/draw`, {}); }} className={primary}>Generate draw</button>}
    {isOrganizer && canDelete && <button disabled={busy} onClick={() => { if (confirm("Delete this draft tournament permanently?")) void act(`/api/tournaments/${tournamentId}`, undefined, "DELETE", () => { router.push("/tournaments"); router.refresh(); }); }} className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700">Delete draft</button>}
    {isOrganizer && !["COMPLETED", "CANCELLED", "DRAFT"].includes(status) && <button disabled={busy} onClick={() => { if (confirm("Cancel this tournament? Unfinished matches will be abandoned and this cannot be undone.")) void act(`/api/tournaments/${tournamentId}`, { status: "CANCELLED" }, "PATCH"); }} className="rounded-full border border-red-200 px-4 py-2 text-sm text-red-700">Cancel tournament</button>}
    {mine && <span className="rounded-full bg-slate-100 px-3 py-2 text-xs text-slate-600">Your registration: {mine.replaceAll("_", " ").toLowerCase()}</span>}
    {error && <p role="alert" className="w-full text-sm text-red-600">{error}</p>}
  </div>;
}
