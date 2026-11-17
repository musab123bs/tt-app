"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

export type ActionField = {
  name: string;
  label: string;
  type?: "text" | "textarea" | "select" | "datetime-local" | "email";
  options?: ReadonlyArray<readonly [string, string]>;
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  help?: string;
};

type Props = {
  label: string;
  title: string;
  description: string;
  endpoint: string;
  method?: "PATCH" | "PUT" | "POST";
  payload?: Record<string, unknown>;
  fields?: ActionField[];
  tone?: "default" | "danger" | "primary";
  confirmLabel?: string;
  disabled?: boolean;
  redirectTo?: string;
};

const buttonTone = {
  default: "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  primary: "bg-[#0B82FF] text-white hover:bg-blue-700",
  danger: "border border-red-200 bg-white text-red-700 hover:bg-red-50",
};

export function ActionDialog({ label, title, description, endpoint, method = "PATCH", payload = {}, fields = [{ name: "reason", label: "Reason", type: "textarea", required: true }], tone = "default", confirmLabel = "Confirm", disabled, redirectTo }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(form: HTMLFormElement) {
    setBusy(true);
    setError("");
    const values = Object.fromEntries(new FormData(form).entries());
    const body: Record<string, unknown> = { ...payload };
    for (const field of fields) {
      const raw = String(values[field.name] ?? "");
      if (field.type === "datetime-local") body[field.name] = raw ? new Date(raw).toISOString() : null;
      else if (raw || field.required) body[field.name] = raw;
    }
    try {
      const response = await fetch(endpoint, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) { setError(result.error ?? "The action could not be completed."); return; }
      dialog.current?.close();
      if (redirectTo) router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Network error. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return <>
    <button type="button" disabled={disabled} onClick={() => { setError(""); dialog.current?.showModal(); }} className={`rounded-full px-3.5 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${buttonTone[tone]}`}>{label}</button>
    <dialog ref={dialog} className="m-auto w-[min(92vw,32rem)] rounded-2xl p-0 shadow-xl backdrop:bg-slate-950/50">
      <form onSubmit={(event) => { event.preventDefault(); void submit(event.currentTarget); }} className="space-y-4 p-6">
        <div><h2 className="text-lg font-semibold text-slate-900">{title}</h2><p className="mt-1 text-sm text-slate-600">{description}</p></div>
        {fields.map((field) => <label key={field.name} className="block text-sm font-medium text-slate-700">{field.label}
          {field.type === "textarea" ? <textarea name={field.name} required={field.required} defaultValue={field.defaultValue} placeholder={field.placeholder} rows={3} maxLength={2000} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
            : field.type === "select" ? <select name={field.name} required={field.required} defaultValue={field.defaultValue} className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm">{field.options?.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select>
              : <input name={field.name} type={field.type ?? "text"} required={field.required} defaultValue={field.defaultValue} placeholder={field.placeholder} className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />}
          {field.help && <span className="mt-1 block text-xs font-normal text-slate-500">{field.help}</span>}
        </label>)}
        {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={() => dialog.current?.close()} className="rounded-full border border-slate-300 px-4 py-2 text-sm">Cancel</button>
          <button disabled={busy} className={`rounded-full px-4 py-2 text-sm font-medium text-white disabled:opacity-60 ${tone === "danger" ? "bg-red-600 hover:bg-red-700" : "bg-slate-900 hover:bg-slate-800"}`}>{busy ? "Working…" : confirmLabel}</button>
        </div>
      </form>
    </dialog>
  </>;
}
