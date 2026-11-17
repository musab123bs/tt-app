"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

function toLocalInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function FixtureScheduleForm({ tournamentId, fixtureId, scheduledAt }: { tournamentId: string; fixtureId: string; scheduledAt: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return <form className="mt-2 flex flex-wrap items-center gap-2" onSubmit={async (event) => {
    event.preventDefault();
    const value = String(new FormData(event.currentTarget).get("scheduledAt") ?? "");
    if (!value) return;
    setBusy(true); setError("");
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/fixtures/${fixtureId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ scheduledAt: new Date(value).toISOString() }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setError(result.error ?? "Could not schedule match."); else router.refresh();
    } catch { setError("Network error. Try again."); } finally { setBusy(false); }
  }}>
    <label className="sr-only" htmlFor={`schedule-${fixtureId}`}>Match time</label>
    <input id={`schedule-${fixtureId}`} name="scheduledAt" type="datetime-local" required defaultValue={toLocalInput(scheduledAt)} className="rounded-lg border border-slate-300 px-2 py-1 text-xs" />
    <button disabled={busy} className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs disabled:opacity-60">{busy ? "Saving…" : "Schedule"}</button>
    {error && <span role="alert" className="w-full text-xs text-red-600">{error}</span>}
  </form>;
}
