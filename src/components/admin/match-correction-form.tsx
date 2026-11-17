"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function MatchCorrectionForm({ matchId, bestOf, player1, player2, games }: { matchId: string; bestOf: number; player1: string; player2: string; games: Array<{ player1Score: number; player2Score: number }> }) {
  const router = useRouter();
  const [rows, setRows] = useState(games.length ? games : [{ player1Score: 0, player2Score: 0 }]);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const update = (index: number, key: "player1Score" | "player2Score", value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [key]: Math.max(0, Math.min(99, Number(value) || 0)) } : row));

  return <form className="space-y-3" onSubmit={async (event) => {
    event.preventDefault();
    if (!confirm("Correct this match result? The original result is preserved, statistics and tournament standings will be recalculated.")) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/admin/matches/${matchId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "correct", reason, games: rows }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setMessage({ ok: false, text: result.error ?? "Correction failed." });
      else { setMessage({ ok: true, text: "Result corrected." }); setReason(""); router.refresh(); }
    } catch { setMessage({ ok: false, text: "Network error. Try again." }); } finally { setBusy(false); }
  }}>
    <p className="text-xs text-slate-500">Best of {bestOf}. Enter each game in order; every game must end at 11+ with a two point lead, and the match must be decided by the final game.</p>
    <div className="overflow-x-auto"><table className="text-sm"><thead><tr className="text-xs text-slate-500"><th className="pr-3 text-left font-medium">Game</th><th className="px-2 text-left font-medium">{player1}</th><th className="px-2 text-left font-medium">{player2}</th><th /></tr></thead>
      <tbody>{rows.map((row, index) => <tr key={index}><td className="py-1 pr-3">{index + 1}</td>
        <td className="px-2 py-1"><input aria-label={`Game ${index + 1} ${player1}`} type="number" min={0} max={99} value={row.player1Score} onChange={(event) => update(index, "player1Score", event.target.value)} className="w-20 rounded-lg border border-slate-300 px-2 py-1" /></td>
        <td className="px-2 py-1"><input aria-label={`Game ${index + 1} ${player2}`} type="number" min={0} max={99} value={row.player2Score} onChange={(event) => update(index, "player2Score", event.target.value)} className="w-20 rounded-lg border border-slate-300 px-2 py-1" /></td>
        <td className="py-1">{rows.length > 1 && <button type="button" onClick={() => setRows((current) => current.filter((_, i) => i !== index))} className="text-xs text-red-600">Remove</button>}</td></tr>)}</tbody></table></div>
    {rows.length < bestOf && <button type="button" onClick={() => setRows((current) => [...current, { player1Score: 0, player2Score: 0 }])} className="text-sm text-blue-700">+ Add game</button>}
    <label className="block text-sm font-medium">Reason for correction<textarea required minLength={3} maxLength={500} rows={2} value={reason} onChange={(event) => setReason(event.target.value)} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" /></label>
    {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
    <button disabled={busy} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving…" : "Save corrected result"}</button>
  </form>;
}
