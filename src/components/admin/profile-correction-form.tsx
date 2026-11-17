"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Profile = { fullName: string; bio: string | null; country: string | null; city: string | null; clubName: string | null; level: string; isPublic: boolean; profileImage: string | null };
const input = "mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm";

export function ProfileCorrectionForm({ userId, profile, levels }: { userId: string; profile: Profile; levels: readonly string[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return <form className="grid gap-3 sm:grid-cols-2" onSubmit={async (event) => {
    event.preventDefault();
    if (!confirm("Save these profile corrections? The change and reason are recorded in the audit log.")) return;
    const data = Object.fromEntries(new FormData(event.currentTarget).entries());
    setBusy(true); setMessage(null);
    try {
      const response = await fetch(`/api/admin/players/${userId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({
        fullName: data.fullName, bio: data.bio, country: data.country, city: data.city, clubName: data.clubName, level: data.level,
        isPublic: data.isPublic === "on", removeImage: data.removeImage === "on", reason: data.reason,
      }) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) setMessage({ ok: false, text: result.error ?? "Could not save corrections." });
      else { setMessage({ ok: true, text: "Profile corrected." }); router.refresh(); }
    } catch { setMessage({ ok: false, text: "Network error. Try again." }); } finally { setBusy(false); }
  }}>
    <label className="text-sm font-medium">Full name<input name="fullName" required minLength={2} maxLength={100} defaultValue={profile.fullName} className={input} /></label>
    <label className="text-sm font-medium">Level<select name="level" defaultValue={profile.level} className={input}>{levels.map((level) => <option key={level} value={level}>{level.toLowerCase()}</option>)}</select></label>
    <label className="text-sm font-medium">City<input name="city" maxLength={80} defaultValue={profile.city ?? ""} className={input} /></label>
    <label className="text-sm font-medium">Country<input name="country" maxLength={80} defaultValue={profile.country ?? ""} className={input} /></label>
    <label className="text-sm font-medium sm:col-span-2">Club<input name="clubName" maxLength={120} defaultValue={profile.clubName ?? ""} className={input} /></label>
    <label className="text-sm font-medium sm:col-span-2">Bio<textarea name="bio" maxLength={500} rows={3} defaultValue={profile.bio ?? ""} className={input} /></label>
    <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="isPublic" defaultChecked={profile.isPublic} /> Profile visible publicly</label>
    {profile.profileImage && <label className="flex items-center gap-2 text-sm text-red-700"><input type="checkbox" name="removeImage" /> Remove profile image</label>}
    <label className="text-sm font-medium sm:col-span-2">Reason for correction<textarea name="reason" required minLength={3} maxLength={500} rows={2} className={input} /></label>
    {message && <p role={message.ok ? "status" : "alert"} className={`text-sm sm:col-span-2 ${message.ok ? "text-emerald-700" : "text-red-600"}`}>{message.text}</p>}
    <div className="sm:col-span-2"><button disabled={busy} className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60">{busy ? "Saving…" : "Save corrections"}</button></div>
  </form>;
}
