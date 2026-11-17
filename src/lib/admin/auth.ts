import "server-only";

import { redirect } from "next/navigation";
import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export type AdminContext = { id: string; name: string; email: string; image: string | null };

// The role is always re-read from the database so a stale session or a
// client-supplied value can never grant administrative access.
async function loadSuperAdmin(): Promise<{ status: 401 | 403 } | { admin: AdminContext }> {
  const session = await getCurrentSession();
  if (!session) return { status: 401 };
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { id: true, name: true, email: true, image: true, role: true, status: true } });
  if (!user || user.role !== "SUPER_ADMIN" || user.status !== "ACTIVE") return { status: 403 };
  return { admin: { id: user.id, name: user.name, email: user.email, image: user.image } };
}

export async function requireSuperAdmin(): Promise<AdminContext> {
  const result = await loadSuperAdmin();
  if ("status" in result) redirect(result.status === 401 ? "/login" : "/dashboard?error=forbidden");
  return result.admin;
}

export async function getAdminApiContext(): Promise<{ admin: AdminContext; response?: never } | { admin?: never; response: NextResponse }> {
  const result = await loadSuperAdmin();
  if ("status" in result) {
    return { response: NextResponse.json({ error: result.status === 401 ? "Unauthorized" : "Super Admin access required." }, { status: result.status }) };
  }
  return { admin: result.admin };
}
