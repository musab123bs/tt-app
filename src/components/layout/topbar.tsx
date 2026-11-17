"use client";

import Link from "next/link";
import Image from "next/image";
import { ChevronDown, LogOut, Menu } from "lucide-react";
import { useState, type RefObject } from "react";
import { useRouter } from "next/navigation";

import { authClient } from "@/lib/auth-client";

type TopbarProps = {
  playerName: string;
  playerImage: string | null;
  mobileMenuOpen: boolean;
  onMenuClick: () => void;
  menuButtonRef: RefObject<HTMLButtonElement | null>;
};

export function Topbar({
  playerName,
  playerImage,
  mobileMenuOpen,
  onMenuClick,
  menuButtonRef,
}: TopbarProps) {
  const router = useRouter();
  const [logoutError, setLogoutError] = useState("");

  async function handleLogout() {
    setLogoutError("");
    const response = await authClient.signOut();
    if (response.error) {
      setLogoutError(response.error.message ?? "Unable to sign out. Please try again.");
      return;
    }

    router.push("/login");
    router.refresh();
  }

  const initials = playerName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-sm">
      <div className="flex min-h-16 items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            ref={menuButtonRef}
            type="button"
            onClick={onMenuClick}
            aria-label="Open dashboard navigation"
            aria-expanded={mobileMenuOpen}
            aria-haspopup="dialog"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B82FF] lg:hidden"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </button>
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Player dashboard</p>
            <p className="truncate text-sm font-semibold text-slate-900">Performance overview</p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            {playerImage ? (
              <Image
                src={playerImage}
                alt=""
                width={36}
                height={36}
                unoptimized
                className="h-9 w-9 rounded-full border border-slate-200 object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-100 text-xs font-semibold text-blue-700"
              >
                {initials || "P"}
              </div>
            )}
            <span className="hidden max-w-40 truncate text-sm font-medium text-slate-700 md:inline">
              {playerName}
            </span>
          </div>

          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B82FF]">
              <span className="sm:hidden">Account</span>
              <span className="hidden sm:inline">Profile</span>
              <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="absolute right-0 mt-2 w-48 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
              <Link
                href="/profile"
                className="block rounded-lg px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B82FF]"
              >
                My profile
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#0B82FF]"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
              {logoutError && (
                <p role="alert" className="px-3 py-2 text-xs text-red-700">
                  {logoutError}
                </p>
              )}
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
