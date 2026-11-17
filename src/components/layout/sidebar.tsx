"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  BarChart3,
  Flag,
  ShieldCheck,
  Medal,
  ChartNoAxesCombined,
  House,
  Settings,
  Trophy,
  UserRound,
} from "lucide-react";
import type { RefObject } from "react";

import { authClient } from "@/lib/auth-client";

const navigation = [
  { label: "Dashboard", href: "/dashboard", icon: House, available: true },
  { label: "My Profile", href: "/profile", icon: UserRound, available: true },
  { label: "My Matches", href: "/matches", icon: Trophy, available: true },
  { label: "Statistics", href: "/analytics", icon: BarChart3, available: true },
  { label: "Tournaments", href: "/tournaments", icon: Medal, available: true },
  { label: "Rankings", href: "/leaderboard", icon: ChartNoAxesCombined, available: true },
  { label: "Notifications", href: "/notifications", icon: Bell, available: true },
  { label: "Report an issue", href: "/reports", icon: Flag, available: true },
  { label: "Settings", icon: Settings, available: false },
] as const;

type SidebarProps = {
  mobileOpen: boolean;
  onClose: () => void;
  navigationRef: RefObject<HTMLDivElement | null>;
};

function NavigationContent({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const { data: session } = authClient.useSession();
  // UI hint only: every admin route and API re-checks the role on the server.
  const isSuperAdmin = (session?.user as { role?: string } | undefined)?.role === "SUPER_ADMIN";

  return (
    <>
      <div className="mb-9 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B82FF] text-white">
          <Trophy className="h-5 w-5" aria-hidden="true" />
        </div>
        <div>
          <p className="text-base font-semibold text-slate-900">Table Tennis</p>
          <p className="text-xs text-slate-500">Analytics Suite</p>
        </div>
      </div>

      <nav aria-label="Dashboard navigation" className="space-y-1.5">
        {navigation.map((item) => {
          const Icon = item.icon;
          if ("href" in item) {
            const active = item.href === "/dashboard"
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? "bg-blue-50 text-blue-700"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                {item.label}
              </Link>
            );
          }

          return (
            <button
              key={item.label}
              type="button"
              disabled
              title="Coming soon"
              className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-slate-400"
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              <span className="text-[10px] font-medium uppercase tracking-wide">Soon</span>
            </button>
          );
        })}
        {isSuperAdmin && (
          <Link href="/admin" onClick={onClose} className="mt-2 flex items-center gap-3 rounded-xl bg-slate-900 px-3 py-2.5 text-sm font-medium text-white hover:bg-slate-800">
            <ShieldCheck className="h-4 w-4" aria-hidden="true" />
            Admin panel
          </Link>
        )}
      </nav>

      <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-center gap-2 text-slate-900">
          <ChartNoAxesCombined className="h-4 w-4 text-[#0B82FF]" aria-hidden="true" />
          <span className="text-sm font-semibold">Your progress</span>
        </div>
        <p className="text-xs leading-5 text-slate-600">
          Match analytics will appear here as your completed match history is recorded.
        </p>
      </div>
    </>
  );
}

export function Sidebar({ mobileOpen, onClose, navigationRef }: SidebarProps) {
  return (
    <>
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white p-5 lg:flex lg:flex-col">
        <NavigationContent />
      </aside>

      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            onClick={onClose}
            className="absolute inset-0 bg-slate-950/40"
          />
          <div
            ref={navigationRef}
            role="dialog"
            aria-modal="true"
            aria-label="Dashboard navigation"
            className="relative flex h-full w-[min(20rem,85vw)] flex-col border-r border-slate-200 bg-white p-5 shadow-2xl"
          >
            <div className="mb-4 flex justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B82FF]"
              >
                Close menu
              </button>
            </div>
            <NavigationContent onClose={onClose} />
          </div>
        </div>
      )}
    </>
  );
}
