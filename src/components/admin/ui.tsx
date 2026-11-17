import Link from "next/link";
import type { ReactNode } from "react";

import type { PageMeta } from "@/lib/admin/pagination";

export function AdminHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h1 className="text-2xl font-semibold tracking-tight text-slate-900">{title}</h1>{description && <p className="mt-1 text-sm text-slate-600">{description}</p>}</div>{action}</div>;
}

export function StatCard({ label, value, hint, href }: { label: string; value: ReactNode; hint?: string; href?: string }) {
  const body = <><p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>{hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}</>;
  return href ? <Link href={href} className="rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-blue-300">{body}</Link> : <div className="rounded-2xl border border-slate-200 bg-white p-4">{body}</div>;
}

export function Panel({ title, children, action, className = "" }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-5 ${className}`}>{(title || action) && <div className="mb-3 flex items-center justify-between gap-3">{title && <h2 className="font-semibold text-slate-900">{title}</h2>}{action}</div>}{children}</section>;
}

const tones: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700", COMPLETED: "bg-emerald-50 text-emerald-700", RESOLVED: "bg-emerald-50 text-emerald-700", APPROVED: "bg-emerald-50 text-emerald-700",
  SUSPENDED: "bg-amber-50 text-amber-800", PENDING: "bg-amber-50 text-amber-800", UNDER_REVIEW: "bg-amber-50 text-amber-800", REGISTRATION_CLOSED: "bg-amber-50 text-amber-800",
  RESTRICTED: "bg-red-50 text-red-700", DELETED: "bg-slate-200 text-slate-600", CANCELLED: "bg-red-50 text-red-700", REJECTED: "bg-red-50 text-red-700", ABANDONED: "bg-slate-100 text-slate-600", REMOVED: "bg-red-50 text-red-700",
  IN_PROGRESS: "bg-blue-50 text-blue-700", SCHEDULED: "bg-slate-100 text-slate-700", OPEN_REGISTRATION: "bg-blue-50 text-blue-700", DRAFT: "bg-slate-100 text-slate-600",
  SUPER_ADMIN: "bg-violet-50 text-violet-700", ADMIN: "bg-violet-50 text-violet-700",
};

export function StatusBadge({ value }: { value: string }) {
  return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[value] ?? "bg-slate-100 text-slate-700"}`}>{value.replaceAll("_", " ").toLowerCase()}</span>;
}

export function DataTable({ headers, children, empty }: { headers: string[]; children: ReactNode; empty?: boolean }) {
  return <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
    <table className="min-w-full text-left text-sm">
      <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr>{headers.map((header) => <th key={header} scope="col" className="whitespace-nowrap px-4 py-3 font-medium">{header}</th>)}</tr></thead>
      <tbody className="divide-y divide-slate-100">{children}</tbody>
    </table>
    {empty && <p className="p-8 text-center text-sm text-slate-500">No records match these filters.</p>}
  </div>;
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`whitespace-nowrap px-4 py-3 align-top ${className}`}>{children}</td>;
}

type FilterField = { name: string; label: string; type?: "text" | "date"; options?: ReadonlyArray<readonly [string, string]>; placeholder?: string };

export function FilterBar({ fields, values, basePath }: { fields: FilterField[]; values: Record<string, string | undefined>; basePath: string }) {
  return <form method="get" action={basePath} className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-4">
    {fields.map((field) => <label key={field.name} className="text-xs font-medium text-slate-600">{field.label}
      {field.options
        ? <select name={field.name} defaultValue={values[field.name] ?? ""} className="mt-1 block rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"><option value="">All</option>{field.options.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
        : <input name={field.name} type={field.type ?? "text"} defaultValue={values[field.name] ?? ""} placeholder={field.placeholder} className="mt-1 block rounded-lg border border-slate-300 px-3 py-2 text-sm" />}
    </label>)}
    <button className="rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white">Apply</button>
    <Link href={basePath} className="rounded-full px-3 py-2 text-sm text-slate-500 hover:text-slate-900">Reset</Link>
  </form>;
}

export function Pagination({ meta, basePath, params }: { meta: PageMeta; basePath: string; params: Record<string, string | undefined> }) {
  const href = (page: number) => {
    const search = new URLSearchParams(Object.entries({ ...params, page: String(page) }).filter((entry): entry is [string, string] => Boolean(entry[1])));
    return `${basePath}?${search.toString()}`;
  };
  return <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
    <p>{meta.total} record{meta.total === 1 ? "" : "s"} · page {meta.page} of {meta.totalPages}</p>
    <div className="flex gap-2">
      {meta.page > 1 ? <Link href={href(meta.page - 1)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5">Previous</Link> : <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-300">Previous</span>}
      {meta.page < meta.totalPages ? <Link href={href(meta.page + 1)} className="rounded-full border border-slate-300 bg-white px-3 py-1.5">Next</Link> : <span className="rounded-full border border-slate-200 px-3 py-1.5 text-slate-300">Next</span>}
    </div>
  </div>;
}

export const formatDate = (value: Date | string | null | undefined, withTime = true) => value ? new Intl.DateTimeFormat("en", withTime ? { dateStyle: "medium", timeStyle: "short" } : { dateStyle: "medium" }).format(new Date(value)) : "—";
export const label = (value: string) => value.replaceAll("_", " ").toLowerCase().replace(/^./, (char) => char.toUpperCase());
export const options = (values: readonly string[]) => values.map((value) => [value, label(value)] as const);
