"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import type { PlatformSettings } from "@/lib/services/platform-settings";

const input = "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";
const pretty = (value: string | number) => String(value).replaceAll("_", " ").toLowerCase();

function Checks<T extends string | number>({ name, values, selected }: { name: string; values: readonly T[]; selected: readonly T[] }) {
  return <div className="mt-1 flex flex-wrap gap-3">{values.map((value) => <label key={String(value)} className="flex items-center gap-1.5 text-sm"><input type="checkbox" name={name} value={String(value)} defaultChecked={selected.includes(value)} />{pretty(value)}</label>)}</div>;
}

export function SettingsForm({ settings, profileFields, levels, tieBreaks }: { settings: PlatformSettings; profileFields: readonly string[]; levels: readonly string[]; tieBreaks: readonly string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function submit(form: HTMLFormElement) {
    const data = new FormData(form);
    const all = (name: string) => data.getAll(name).map(String);
    const num = (name: string) => Number(data.get(name));
    const tieBreakOrder = [1, 2, 3, 4].map((index) => String(data.get(`tieBreak${index}`) ?? "")).filter(Boolean);
    const payload: PlatformSettings = {
      general: { platformName: String(data.get("platformName") ?? ""), logoUrl: String(data.get("logoUrl") ?? ""), description: String(data.get("description") ?? ""), supportEmail: String(data.get("supportEmail") ?? ""), timezone: String(data.get("timezone") ?? "") },
      player: { allowedProfileFields: all("allowedProfileFields") as PlatformSettings["player"]["allowedProfileFields"], levelOptions: all("levelOptions") as PlatformSettings["player"]["levelOptions"], profilesPublicByDefault: data.get("profilesPublicByDefault") === "on" },
      match: { defaultBestOf: num("matchDefaultBestOf") as 3 | 5 | 7, availableBestOf: all("availableBestOf").map(Number) as Array<3 | 5 | 7> },
      tournament: { availableFormats: all("availableFormats") as PlatformSettings["tournament"]["availableFormats"], defaultRequiresApproval: data.get("defaultRequiresApproval") === "on", defaultMinParticipants: num("defaultMinParticipants"), defaultMaxParticipants: num("defaultMaxParticipants"), defaultBestOf: num("tournamentDefaultBestOf") as 3 | 5 | 7 },
      ranking: { minCompletedMatches: num("minCompletedMatches"), tieBreakOrder: tieBreakOrder as PlatformSettings["ranking"]["tieBreakOrder"] },
    };
    if (!confirm("Save platform settings? Changes apply to new activity only; existing matches and tournaments are not modified.")) return;
    setBusy(true); setMessage(null);
    try {
      const response = await fetch("/api/admin/settings", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setMessage({ ok: false, text: `${result.error ?? "Settings could not be saved."}${result.field ? ` (${result.field})` : ""}` });
      else { setMessage({ ok: true, text: "Settings saved." }); router.refresh(); }
    } catch { setMessage({ ok: false, text: "Network error. Try again." }); } finally { setBusy(false); }
  }

  const section = "rounded-2xl border border-slate-200 bg-white p-5";
  return <form onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }} className="space-y-5">
    <section className={section} id="general"><h2 className="font-semibold">General</h2><div className="mt-3 grid gap-3 sm:grid-cols-2">
      <label className="text-sm font-medium">Platform name<input name="platformName" required minLength={2} maxLength={80} defaultValue={settings.general.platformName} className={input} /></label>
      <label className="text-sm font-medium">Logo URL<input name="logoUrl" type="url" defaultValue={settings.general.logoUrl} className={input} /></label>
      <label className="text-sm font-medium">Support email<input name="supportEmail" type="email" defaultValue={settings.general.supportEmail} className={input} /></label>
      <label className="text-sm font-medium">Default timezone<input name="timezone" required defaultValue={settings.general.timezone} placeholder="e.g. Asia/Karachi" className={input} /></label>
      <label className="text-sm font-medium sm:col-span-2">Description<textarea name="description" maxLength={500} rows={2} defaultValue={settings.general.description} className={input} /></label>
    </div></section>
    <section className={section} id="player"><h2 className="font-semibold">Player settings</h2>
      <p className="mt-3 text-sm font-medium">Profile fields players may edit</p><Checks name="allowedProfileFields" values={profileFields} selected={settings.player.allowedProfileFields} />
      <p className="mt-3 text-sm font-medium">Selectable player levels</p><Checks name="levelOptions" values={levels} selected={settings.player.levelOptions} />
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="profilesPublicByDefault" defaultChecked={settings.player.profilesPublicByDefault} /> New profiles are public by default</label>
    </section>
    <section className={section} id="match"><h2 className="font-semibold">Match settings</h2>
      <p className="mt-3 text-sm font-medium">Available best-of formats</p><Checks name="availableBestOf" values={[3, 5, 7] as const} selected={settings.match.availableBestOf} />
      <label className="mt-3 block max-w-xs text-sm font-medium">Default match format<select name="matchDefaultBestOf" defaultValue={settings.match.defaultBestOf} className={input}>{[3, 5, 7].map((value) => <option key={value} value={value}>Best of {value}</option>)}</select></label>
    </section>
    <section className={section} id="tournament"><h2 className="font-semibold">Tournament settings</h2>
      <p className="mt-3 text-sm font-medium">Available formats</p><Checks name="availableFormats" values={["SINGLE_ELIMINATION", "ROUND_ROBIN"] as const} selected={settings.tournament.availableFormats} />
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="text-sm font-medium">Default minimum players<input name="defaultMinParticipants" type="number" min={2} max={256} defaultValue={settings.tournament.defaultMinParticipants} className={input} /></label>
        <label className="text-sm font-medium">Default maximum players<input name="defaultMaxParticipants" type="number" min={2} max={256} defaultValue={settings.tournament.defaultMaxParticipants} className={input} /></label>
        <label className="text-sm font-medium">Default match format<select name="tournamentDefaultBestOf" defaultValue={settings.tournament.defaultBestOf} className={input}>{[3, 5, 7].map((value) => <option key={value} value={value}>Best of {value}</option>)}</select></label>
      </div>
      <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" name="defaultRequiresApproval" defaultChecked={settings.tournament.defaultRequiresApproval} /> Require organizer approval for registrations by default</label>
    </section>
    <section className={section} id="ranking"><h2 className="font-semibold">Ranking settings</h2><div className="mt-3 grid gap-3 sm:grid-cols-5">
      <label className="text-sm font-medium">Min. completed matches<input name="minCompletedMatches" type="number" min={1} max={100} defaultValue={settings.ranking.minCompletedMatches} className={input} /></label>
      {[1, 2, 3, 4].map((index) => <label key={index} className="text-sm font-medium">Tie-break {index}<select name={`tieBreak${index}`} defaultValue={settings.ranking.tieBreakOrder[index - 1] ?? ""} className={input}><option value="">—</option>{tieBreaks.map((rule) => <option key={rule} value={rule}>{pretty(rule)}</option>)}</select></label>)}
    </div><p className="mt-2 text-xs text-slate-500">Tie-break order is the default for new round-robin tournaments. Existing tournaments keep the order they were created with.</p></section>
    {message && <p role={message.ok ? "status" : "alert"} className={`text-sm ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
    <button disabled={busy} className="rounded-full bg-slate-900 px-5 py-2.5 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving…" : "Save settings"}</button>
  </form>;
}
