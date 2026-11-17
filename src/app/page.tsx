import Link from "next/link";
import { ArrowRight, BarChart3, Database, Lock, Trophy } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { siteConfig } from "@/config/site";

const features = [
  {
    title: "Player authentication",
    description: "Built-in registration, secure login, and protected account access for each player.",
    icon: Lock,
  },
  {
    title: "Player profiles",
    description: "Players can manage personal details, level, and profile imagery in a dedicated profile workspace.",
    icon: BarChart3,
  },
  {
    title: "Future-ready foundation",
    description: "The app now supports role-based access and a scalable player-first data model for later phases.",
    icon: Trophy,
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0B82FF] text-white shadow-sm">
            <Trophy className="h-5 w-5" />
          </div>
          <div>
            <p className="text-lg font-semibold text-slate-900">{siteConfig.name}</p>
          </div>
        </div>

        <nav className="hidden items-center gap-8 text-sm text-slate-600 md:flex">
          {siteConfig.navItems.map((item) => (
            <Link key={item.href} href={item.href} className="transition-colors hover:text-slate-900">
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <Link href="/login">
            <Button variant="secondary">Sign in</Button>
          </Link>
          <Link href="/register">
            <Button>Join now</Button>
          </Link>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-6 pb-16 pt-8 sm:px-8 lg:pt-12">
        <section className="grid items-center gap-10 lg:grid-cols-[1.2fr_0.8fr]">
          <div>
            <Badge>Phase 2 authentication</Badge>
            <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
              Secure player accounts and profile management for the analytics platform.
            </h1>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              {siteConfig.description} Phase two introduces player login, secure registration, role-based access,
              profile management, and Cloudinary-powered image storage for each member of the platform.
            </p>

            <div className="mt-8 flex flex-col gap-4 sm:flex-row">
              <Link href="/register">
                <Button className="inline-flex items-center gap-2">
                  Create account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/api/health">
                <Button variant="secondary">Check API health</Button>
              </Link>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-[0_20px_45px_rgba(15,23,42,0.06)] sm:p-6">
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm text-slate-500">System status</p>
                  <p className="mt-2 text-3xl font-semibold text-slate-900">Ready</p>
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B82FF]/10 text-[#0B82FF]">
                  <Database className="h-6 w-6" />
                </div>
              </div>

              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-sm text-slate-600">Better Auth</span>
                  <span className="text-sm font-medium text-slate-900">Configured</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-sm text-slate-600">Prisma</span>
                  <span className="text-sm font-medium text-slate-900">Auth + profile models</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                  <span className="text-sm text-slate-600">Cloudinary</span>
                  <span className="text-sm font-medium text-slate-900">Secure uploads</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-8 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Key capabilities</p>
            <h2 className="mt-3 text-3xl font-semibold tracking-tight text-slate-900">A strong base for player operations.</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {features.map(({ title, description, icon: Icon }) => (
              <Card key={title} className="group p-6 transition-transform duration-200 hover:-translate-y-1">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-[#0B82FF]">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-xl font-semibold text-slate-900">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-slate-600">{description}</p>
              </Card>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/70">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-6 py-6 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 Table Tennis Analytics</p>
          <p>Phase 2 is focused on secure authentication and player profile ownership.</p>
        </div>
      </footer>
    </div>
  );
}
