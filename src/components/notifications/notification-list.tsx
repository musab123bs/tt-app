"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Item = { id: string; title: string; body: string | null; link: string | null; readAt: string | null; createdAt: string };

export function NotificationList({ items, unread }: { items: Item[]; unread: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function markRead(ids?: string[]) {
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(ids ? { ids } : {}) });
      if (!response.ok) setError("Could not update notifications."); else router.refresh();
    } catch { setError("Network error. Try again."); } finally { setBusy(false); }
  }

  if (!items.length) return <div className="mt-8 rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center"><h2 className="font-semibold">No notifications yet</h2><p className="mt-2 text-sm text-slate-500">Tournament updates and platform messages will appear here.</p></div>;

  return <div className="mt-6 space-y-3">
    <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{unread} unread</p>{unread > 0 && <button disabled={busy} onClick={() => markRead()} className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm disabled:opacity-60">Mark all as read</button>}</div>
    {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
    <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      {items.map((item) => <li key={item.id} className={`flex items-start gap-3 p-4 ${item.readAt ? "" : "bg-blue-50/50"}`}>
        <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${item.readAt ? "bg-transparent" : "bg-blue-600"}`} />
        <div className="min-w-0 flex-1">
          {item.link ? <Link href={item.link} onClick={() => { if (!item.readAt) void markRead([item.id]); }} className="font-medium text-slate-900 hover:text-blue-700">{item.title}</Link> : <p className="font-medium text-slate-900">{item.title}</p>}
          {item.body && <p className="mt-0.5 text-sm text-slate-600">{item.body}</p>}
          <p className="mt-1 text-xs text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
        </div>
        {!item.readAt && <button disabled={busy} onClick={() => markRead([item.id])} className="text-xs text-slate-500 hover:text-slate-900">Mark read</button>}
      </li>)}
    </ul>
  </div>;
}
