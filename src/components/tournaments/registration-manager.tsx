"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Participant = { id: string; name: string; status: string; seed: number | null; registeredAt: string; removedReason: string | null; level: string | null };

const statusStyle: Record<string, string> = {
  APPROVED: "bg-emerald-50 text-emerald-700",
  PENDING: "bg-amber-50 text-amber-700",
  REJECTED: "bg-red-50 text-red-700",
  WITHDRAWN: "bg-slate-100 text-slate-600",
  REMOVED: "bg-red-50 text-red-700",
};

export function RegistrationManager({ tournamentId, participants, drawGenerated, finished }: { tournamentId: string; participants: Participant[]; drawGenerated: boolean; finished: boolean }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function review(participantId: string, body: Record<string, unknown>) {
    setBusyId(participantId);
    setError("");
    try {
      const response = await fetch(`/api/tournaments/${tournamentId}/participants`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ participantId, ...body }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setError(result.error ?? "Could not update registration.");
      else router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  if (!participants.length) return <p className="mt-3 text-sm text-slate-500">No registrations yet.</p>;

  return <div className="mt-3">
    {error && <p role="alert" className="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <ul className="divide-y divide-slate-100">
      {participants.map((participant) => {
        const busy = busyId === participant.id;
        return <li key={participant.id} className="py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0"><p className="truncate text-sm font-medium">{participant.name}</p><p className="text-xs text-slate-500">Registered {new Date(participant.registeredAt).toLocaleDateString()}{participant.level ? ` · ${participant.level.toLowerCase()}` : ""}</p></div>
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${statusStyle[participant.status] ?? "bg-slate-100"}`}>{participant.status.toLowerCase()}</span>
          </div>
          {participant.removedReason && <p className="mt-1 text-xs text-slate-500">Reason: {participant.removedReason}</p>}
          {!finished && <div className="mt-2 flex flex-wrap items-center gap-2">
            {participant.status === "PENDING" && <>
              <button disabled={busy} onClick={() => review(participant.id, { decision: "APPROVE" })} className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white disabled:opacity-60">Approve</button>
              <button disabled={busy} onClick={() => { if (confirm(`Reject ${participant.name}'s registration?`)) void review(participant.id, { decision: "REJECT" }); }} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-60">Reject</button>
            </>}
            {participant.status === "APPROVED" && !drawGenerated && <form className="flex items-center gap-1" onSubmit={(event) => { event.preventDefault(); const value = new FormData(event.currentTarget).get("seed"); void review(participant.id, { decision: "APPROVE", seed: value ? Number(value) : null }); }}>
              <label className="sr-only" htmlFor={`seed-${participant.id}`}>Seed</label>
              <input id={`seed-${participant.id}`} name="seed" type="number" min={1} max={256} defaultValue={participant.seed ?? ""} placeholder="Seed" className="w-20 rounded-lg border border-slate-300 px-2 py-1 text-xs" />
              <button disabled={busy} className="rounded-full border border-slate-300 px-3 py-1.5 text-xs disabled:opacity-60">Save seed</button>
            </form>}
            {(participant.status === "APPROVED" || participant.status === "PENDING") && <button disabled={busy} onClick={() => {
              const reason = prompt(`Reason for removing ${participant.name}:${drawGenerated ? " Their remaining matches will be forfeited." : ""}`);
              if (reason?.trim()) void review(participant.id, { decision: "REMOVE", reason: reason.trim() });
            }} className="rounded-full border border-red-200 px-3 py-1.5 text-xs text-red-700 disabled:opacity-60">Remove</button>}
          </div>}
        </li>;
      })}
    </ul>
  </div>;
}
