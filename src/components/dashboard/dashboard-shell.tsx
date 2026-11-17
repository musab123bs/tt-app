"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";

import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";

type DashboardShellProps = {
  children: ReactNode;
  playerName: string;
  playerImage: string | null;
};

export function DashboardShell({ children, playerName, playerImage }: DashboardShellProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigationRef = useRef<HTMLDivElement>(null);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), []);

  useEffect(() => {
    if (!mobileMenuOpen) {
      return;
    }

    const navigationElement = navigationRef.current;
    const menuButtonElement = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    navigationElement?.querySelector<HTMLElement>("a[href], button:not(:disabled)")?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        closeMobileMenu();
        menuButtonElement?.focus();
        return;
      }

      if (event.key !== "Tab" || !navigationElement) {
        return;
      }

      const focusableElements = Array.from(
        navigationElement.querySelectorAll<HTMLElement>("a[href], button:not(:disabled)"),
      );
      const first = focusableElements[0];
      const last = focusableElements[focusableElements.length - 1];

      if (!first || !last) {
        event.preventDefault();
      } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", handleKeyDown);
      if (
        document.activeElement instanceof HTMLElement &&
        navigationElement?.contains(document.activeElement)
      ) {
        menuButtonElement?.focus();
      }
    };
  }, [closeMobileMenu, mobileMenuOpen]);

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <Sidebar
          mobileOpen={mobileMenuOpen}
          onClose={closeMobileMenu}
          navigationRef={navigationRef}
        />
        <main className="min-w-0 flex-1">
          <Topbar
            playerName={playerName}
            playerImage={playerImage}
            mobileMenuOpen={mobileMenuOpen}
            onMenuClick={() => setMobileMenuOpen(true)}
            menuButtonRef={menuButtonRef}
          />
          {children}
        </main>
      </div>
    </div>
  );
}
