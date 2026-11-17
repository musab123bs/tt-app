"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function TournamentCreateForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit(formData: FormData) {
    setSaving(true); setError("");
    const payload = Object.fromEntries(formData.entries());
    Object.assign(payload, { maxParticipants: Number(payload.maxParticipants), minParticipants: Number(payload.minParticipants), bestOf: Number(payload.bestOf), registrationRequiresApproval: payload.registrationRequiresApproval === "on", status: payload.status || "DRAFT", startDate: new Date(String(payload.startDate)).toISOString(), endDate: new Date(String(payload.endDate)).toISOString(), registrationDeadline: new Date(String(payload.registrationDeadline)).toISOString() });
    const response = await fetch("/api/tournaments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const result = await response.json();
    if (!response.ok) { setError(result.error ?? "Could not create tournament."); setSaving(false); return; }
    router.push(`/tournaments/${result.tournament.id}`); router.refresh();
  }
  return <form action={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
    <div className="grid gap-4 sm:grid-cols-2"><label className="sm:col-span-2 text-sm font-medium">Tournament name<input required name="name" minLength={3} maxLength={120} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Location<input name="location" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Banner image URL<input name="bannerImage" type="url" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Start date<input required name="startDate" type="datetime-local" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">End date<input required name="endDate" type="datetime-local" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Registration deadline<input required name="registrationDeadline" type="datetime-local" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Format<select name="format" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="SINGLE_ELIMINATION">Single elimination</option><option value="ROUND_ROBIN">Round robin</option></select></label>
      <label className="text-sm font-medium">Maximum players<input required name="maxParticipants" type="number" min="2" max="256" defaultValue="16" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="text-sm font-medium">Minimum players<input required name="minParticipants" type="number" min="2" max="256" defaultValue="2" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
      <label className="text-sm font-medium">Match format<select name="bestOf" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="3">Best of 3</option><option value="5" selected>Best of 5</option><option value="7">Best of 7</option></select></label><label className="text-sm font-medium">Initial status<select name="status" className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5"><option value="DRAFT">Draft</option><option value="OPEN_REGISTRATION">Open registration</option></select></label>
      <label className="sm:col-span-2 text-sm font-medium">Description<textarea name="description" rows={3} maxLength={2000} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label><label className="sm:col-span-2 text-sm font-medium">Rules<textarea name="rules" rows={3} maxLength={5000} className="mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5" /></label>
    </div><label className="flex items-center gap-2 text-sm"><input name="registrationRequiresApproval" type="checkbox" /> Require organizer approval for registrations</label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}<button disabled={saving} className="rounded-full bg-[#0B82FF] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Creating…" : "Create tournament"}</button>
  </form>;
}
