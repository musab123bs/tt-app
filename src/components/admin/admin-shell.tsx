"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { BarChart3, ClipboardList, Flag, Gavel, LayoutDashboard, Medal, Menu, ScrollText, Settings, ShieldCheck, Swords, UserRound, Users, X } from "lucide-react";

const navigation = [
  { label: "Overview", href: "/admin", icon: LayoutDashboard },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Players", href: "/admin/players", icon: UserRound },
  { label: "Matches", href: "/admin/matches", icon: Swords },
  { label: "Tournaments", href: "/admin/tournaments", icon: Medal },
  { label: "Reports & Disputes", href: "/admin/reports", icon: Flag },
  { label: "Moderation", href: "/admin/moderation", icon: Gavel },
  { label: "Rankings", href: "/admin/rankings", icon: BarChart3 },
  { label: "Platform Settings", href: "/admin/settings", icon: Settings },
  { label: "Audit Logs", href: "/admin/audit", icon: ScrollText },
] as const;

function Nav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return <nav aria-label="Admin navigation" className="space-y-1">
    {navigation.map((item) => {
      const Icon = item.icon;
      const active = item.href === "/admin" ? pathname === "/admin" : pathname === item.href || pathname.startsWith(`${item.href}/`);
      return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${active ? "bg-white/10 text-white" : "text-slate-300 hover:bg-white/5 hover:text-white"}`}>
        <Icon className="h-4 w-4" aria-hidden="true" />{item.label}
      </Link>;
    })}
  </nav>;
}

export function AdminShell({ children, adminName }: { children: ReactNode; adminName: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  const brand = <div className="mb-8 flex items-center gap-3 px-1"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B82FF] text-white"><ShieldCheck className="h-5 w-5" aria-hidden="true" /></div><div><p className="text-sm font-semibold text-white">Super Admin</p><p className="text-xs text-slate-400">Platform management</p></div></div>;

  return <div className="min-h-screen bg-slate-100">
    <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-slate-900 p-5 lg:flex">
      {brand}<Nav />
      <div className="mt-auto space-y-2 border-t border-white/10 pt-4 text-sm"><Link href="/dashboard" className="flex items-center gap-2 text-slate-300 hover:text-white"><ClipboardList className="h-4 w-4" aria-hidden="true" />Back to player app</Link></div>
    </aside>
    {open && <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Admin navigation">
      <button type="button" aria-label="Close navigation" className="absolute inset-0 bg-slate-950/50" onClick={() => setOpen(false)} />
      <div key={pathname} className="relative flex h-full w-72 flex-col bg-slate-900 p-5">
        <button type="button" onClick={() => setOpen(false)} aria-label="Close navigation" className="absolute right-4 top-4 rounded-lg p-1 text-slate-300 hover:bg-white/10"><X className="h-5 w-5" /></button>
        {brand}<Nav onNavigate={() => setOpen(false)} />
        <Link href="/dashboard" className="mt-auto border-t border-white/10 pt-4 text-sm text-slate-300 hover:text-white">Back to player app</Link>
      </div>
    </div>}
    <div className="lg:pl-64">
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur sm:px-6">
        <button type="button" onClick={() => setOpen(true)} aria-label="Open admin navigation" className="rounded-lg border border-slate-200 p-2 lg:hidden"><Menu className="h-5 w-5" /></button>
        <p className="text-sm text-slate-500">Signed in as <span className="font-medium text-slate-900">{adminName}</span></p>
      </header>
      <main className="p-4 sm:p-6 lg:p-8">{children}</main>
    </div>
  </div>;
}
