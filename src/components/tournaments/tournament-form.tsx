"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export type TournamentFormValues = {
  id: string;
  name: string;
  description: string | null;
  bannerImage: string | null;
  location: string | null;
  startDate: string;
  endDate: string;
  registrationDeadline: string;
  format: "SINGLE_ELIMINATION" | "ROUND_ROBIN";
  status: string;
  maxParticipants: number;
  minParticipants: number;
  bestOf: number;
  registrationRequiresApproval: boolean;
  rules: string | null;
};

const input = "mt-1.5 block w-full rounded-lg border border-slate-300 px-3 py-2.5 disabled:bg-slate-50 disabled:text-slate-500";

function toLocalInput(value?: string) {
  if (!value) return undefined;
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export function TournamentForm({ tournament, lockedSettings = false }: { tournament?: TournamentFormValues; lockedSettings?: boolean }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const editing = Boolean(tournament);

  async function submit(formData: FormData) {
    setSaving(true);
    setError("");
    const raw = Object.fromEntries(formData.entries());
    const payload: Record<string, unknown> = {
      name: raw.name,
      description: raw.description ?? "",
      bannerImage: raw.bannerImage ?? "",
      location: raw.location ?? "",
      rules: raw.rules ?? "",
      startDate: new Date(String(raw.startDate)).toISOString(),
      endDate: new Date(String(raw.endDate)).toISOString(),
      registrationDeadline: new Date(String(raw.registrationDeadline)).toISOString(),
      status: raw.status || "DRAFT",
    };
    if (!lockedSettings) {
      Object.assign(payload, {
        format: raw.format,
        maxParticipants: Number(raw.maxParticipants),
        minParticipants: Number(raw.minParticipants),
        bestOf: Number(raw.bestOf),
        registrationRequiresApproval: raw.registrationRequiresApproval === "on",
      });
    }
    try {
      const response = await fetch(editing ? `/api/tournaments/${tournament!.id}` : "/api/tournaments", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) {
        setError(result.error ?? "Could not save tournament.");
        return;
      }
      router.push(`/tournaments/${editing ? tournament!.id : result.tournament.id}`);
      router.refresh();
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setSaving(false);
    }
  }

  return <form action={submit} className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
    {lockedSettings && <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-800">Players have registered, so format and participant settings are locked.</p>}
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium sm:col-span-2">Tournament name<input required name="name" minLength={3} maxLength={120} defaultValue={tournament?.name} className={input} /></label>
      <label className="text-sm font-medium">Location<input name="location" maxLength={200} defaultValue={tournament?.location ?? ""} className={input} /></label>
      <label className="text-sm font-medium">Banner image URL<input name="bannerImage" type="url" defaultValue={tournament?.bannerImage ?? ""} className={input} /></label>
      <label className="text-sm font-medium">Start date<input required name="startDate" type="datetime-local" defaultValue={toLocalInput(tournament?.startDate)} className={input} /></label>
      <label className="text-sm font-medium">End date<input required name="endDate" type="datetime-local" defaultValue={toLocalInput(tournament?.endDate)} className={input} /></label>
      <label className="text-sm font-medium">Registration deadline<input required name="registrationDeadline" type="datetime-local" defaultValue={toLocalInput(tournament?.registrationDeadline)} className={input} /></label>
      <label className="text-sm font-medium">Format<select name="format" disabled={lockedSettings} defaultValue={tournament?.format ?? "SINGLE_ELIMINATION"} className={input}><option value="SINGLE_ELIMINATION">Single elimination</option><option value="ROUND_ROBIN">Round robin</option></select></label>
      <label className="text-sm font-medium">Maximum players<input required name="maxParticipants" type="number" min="2" max="256" disabled={lockedSettings} defaultValue={tournament?.maxParticipants ?? 16} className={input} /></label>
      <label className="text-sm font-medium">Minimum players<input required name="minParticipants" type="number" min="2" max="256" disabled={lockedSettings} defaultValue={tournament?.minParticipants ?? 2} className={input} /></label>
      <label className="text-sm font-medium">Match format<select name="bestOf" disabled={lockedSettings} defaultValue={String(tournament?.bestOf ?? 5)} className={input}><option value="3">Best of 3</option><option value="5">Best of 5</option><option value="7">Best of 7</option></select></label>
      <label className="text-sm font-medium">Status<select name="status" defaultValue={tournament?.status === "OPEN_REGISTRATION" ? "OPEN_REGISTRATION" : "DRAFT"} className={input}><option value="DRAFT">Draft</option><option value="OPEN_REGISTRATION">Open registration</option></select></label>
      <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" rows={3} maxLength={2000} defaultValue={tournament?.description ?? ""} className={input} /></label>
      <label className="text-sm font-medium sm:col-span-2">Rules<textarea name="rules" rows={3} maxLength={5000} defaultValue={tournament?.rules ?? ""} className={input} /></label>
    </div>
    <label className="flex items-center gap-2 text-sm"><input name="registrationRequiresApproval" type="checkbox" disabled={lockedSettings} defaultChecked={tournament?.registrationRequiresApproval} /> Require organizer approval for registrations</label>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <button disabled={saving} className="rounded-full bg-[#0B82FF] px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{saving ? "Saving…" : editing ? "Save changes" : "Create tournament"}</button>
  </form>;
}
