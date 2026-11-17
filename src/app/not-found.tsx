import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-[0_12px_32px_rgba(15,23,42,0.06)]">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">404</p>
        <h1 className="mt-4 text-3xl font-semibold text-slate-900">Page not found</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          The page you requested is not available in this phase of the project.
        </p>
        <Link href="/" className="mt-6 inline-flex">
          <Button type="button">Return home</Button>
        </Link>
      </div>
    </main>
  );
}
