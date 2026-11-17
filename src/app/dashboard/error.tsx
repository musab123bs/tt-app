"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Player dashboard failed to load.", error);
  }, [error]);

  return (
    <main className="flex min-h-[60vh] items-center justify-center bg-slate-100 px-4 py-10">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-[0_8px_30px_rgba(15,23,42,0.04)]">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard could not load</h1>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          We couldn&apos;t retrieve your player information. Check your connection and try again.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-[#0B82FF] px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0B82FF]"
        >
          Try again
        </button>
      </div>
    </main>
  );
}
