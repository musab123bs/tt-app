import Link from "next/link";
import { Suspense } from "react";

import { ProfileForm } from "@/components/profile/profile-form";
import { getPrismaClient } from "@/lib/prisma";
import { requireUser } from "@/lib/session";

export default function ProfilePage() {
  return (
    <Suspense fallback={<ProfileSkeleton />}>
      <ProfileContent />
    </Suspense>
  );
}

async function ProfileContent() {
  const session = await requireUser();
  const prisma = getPrismaClient();

  const profile = prisma
    ? await prisma.playerProfile.findUnique({
        where: { userId: session.user.id },
      })
    : null;

  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_20px_45px_rgba(15,23,42,0.06)] sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.2em] text-blue-600">Player profile</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Set up your profile</h1>
          </div>
          <Link href="/dashboard" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            Back to dashboard
          </Link>
        </div>

        <ProfileForm
          profile={profile ? { ...profile, dateOfBirth: profile.dateOfBirth ? profile.dateOfBirth.toISOString() : null } : null}
          userName={session.user.name ?? "Player"}
          userImage={session.user.image ?? null}
        />
      </div>
    </main>
  );
}

function ProfileSkeleton() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-5xl animate-pulse">
        <div className="mb-8 h-28 rounded-[2rem] bg-slate-200" />
        <div className="h-[520px] rounded-[2rem] bg-slate-200" />
      </div>
    </main>
  );
}
