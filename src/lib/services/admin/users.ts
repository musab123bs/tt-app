import "server-only";

import { z } from "zod";

import type { AccountStatus, PlayerRole, Prisma } from "@/generated/prisma";
import { AdminError } from "@/lib/admin/errors";
import { pageArgs, pageMeta } from "@/lib/admin/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { getEffectiveAccountStatus } from "@/lib/services/account-status";
import { recordAudit } from "@/lib/services/audit-log";
import { notifySuperAdmins } from "@/lib/services/admin/notify";
import { notifyUsers } from "@/lib/services/notifications";

export const ROLES = ["PLAYER", "COACH", "SCORER", "ADMIN", "SUPER_ADMIN"] as const;
export const ACCOUNT_STATUSES = ["ACTIVE", "SUSPENDED", "RESTRICTED", "DELETED"] as const;

export const userActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("role"), role: z.enum(ROLES), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(3).max(500), startsAt: z.iso.datetime().optional(), endsAt: z.iso.datetime().nullable().optional() }),
  z.object({ action: z.literal("restrict"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("reactivate"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("delete"), reason: z.string().trim().min(3).max(500), confirmEmail: z.string().trim() }),
]);
export type UserAction = z.infer<typeof userActionSchema>;

function db() {
  const prisma = getPrismaClient();
  if (!prisma) throw new AdminError("Database unavailable.", 503);
  return prisma;
}

export async function listUsers(filters: { q?: string; role?: string; status?: string; page: number }) {
  const prisma = db();
  const where: Prisma.UserWhereInput = {
    ...(filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { email: { contains: filters.q, mode: "insensitive" } }, { playerProfile: { is: { fullName: { contains: filters.q, mode: "insensitive" } } } }] } : {}),
    ...((ROLES as readonly string[]).includes(filters.role ?? "") ? { role: filters.role as PlayerRole } : {}),
    ...((ACCOUNT_STATUSES as readonly string[]).includes(filters.status ?? "") ? { status: filters.status as AccountStatus } : { status: { not: "DELETED" } }),
  };
  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: { id: true, name: true, email: true, role: true, status: true, suspendedUntil: true, createdAt: true, lastActiveAt: true, isSystemAccount: true, playerProfile: { select: { fullName: true } } },
      orderBy: { createdAt: "desc" },
      ...pageArgs(filters.page),
    }),
  ]);
  return {
    meta: pageMeta(total, filters.page),
    users: users.map((user) => ({
      id: user.id,
      name: user.playerProfile?.fullName?.trim() || user.name,
      email: user.email,
      role: user.role,
      status: getEffectiveAccountStatus(user),
      suspendedUntil: user.suspendedUntil?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      lastActiveAt: user.lastActiveAt?.toISOString() ?? null,
      isSystemAccount: user.isSystemAccount,
    })),
  };
}

export async function getUserAdminDetail(userId: string) {
  const prisma = db();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true, name: true, email: true, emailVerified: true, image: true, role: true, status: true, suspendedUntil: true, suspensionReason: true,
      deletedAt: true, createdAt: true, updatedAt: true, lastActiveAt: true, isSystemAccount: true,
      playerProfile: { select: { fullName: true, level: true, isPublic: true, country: true, city: true, clubName: true } },
      moderationActions: { orderBy: { createdAt: "desc" }, take: 50, select: { id: true, action: true, reason: true, startsAt: true, endsAt: true, createdAt: true, admin: { select: { name: true } } } },
      _count: { select: { matchesAsPlayer1: true, matchesAsPlayer2: true, tournamentRegistrations: true, tournamentsCreated: true, reportsFiled: true, reportsAgainst: true } },
    },
  });
  if (!user) return null;
  return { ...user, effectiveStatus: getEffectiveAccountStatus(user) };
}

async function assertManageable(tx: Prisma.TransactionClient, adminId: string, userId: string) {
  if (adminId === userId) throw new AdminError("You cannot change your own account from the admin panel.", 400);
  const target = await tx.user.findUnique({ where: { id: userId }, select: { id: true, name: true, email: true, role: true, status: true, suspendedUntil: true, suspensionReason: true, isSystemAccount: true } });
  if (!target) throw new AdminError("User not found.", 404);
  if (target.isSystemAccount) throw new AdminError("This is a protected system account and cannot be changed here.", 403);
  if (target.status === "DELETED") throw new AdminError("This account has been deleted.", 409);
  return target;
}

async function assertAnotherSuperAdmin(tx: Prisma.TransactionClient, excludingId: string) {
  const remaining = await tx.user.count({ where: { role: "SUPER_ADMIN", status: "ACTIVE", id: { not: excludingId } } });
  if (!remaining) throw new AdminError("At least one active Super Admin must remain.", 409);
}

export async function performUserAction(adminId: string, userId: string, input: UserAction) {
  const prisma = db();
  return prisma.$transaction(async (tx) => {
    const target = await assertManageable(tx, adminId, userId);
    const previous = { role: target.role, status: target.status, suspendedUntil: target.suspendedUntil, suspensionReason: target.suspensionReason };

    if (input.action === "role") {
      if (input.role === target.role) throw new AdminError("The user already has this role.", 409);
      if (target.role === "SUPER_ADMIN") await assertAnotherSuperAdmin(tx, target.id);
      const updated = await tx.user.update({ where: { id: userId }, data: { role: input.role }, select: { role: true } });
      await recordAudit(tx, { adminId, action: "USER_ROLE_CHANGED", targetType: "User", targetId: userId, previousValue: { role: target.role }, newValue: updated, reason: input.reason });
      await notifyUsers(tx, [userId], { type: "ACCOUNT_MODERATION", title: "Your account role was updated", body: `New role: ${input.role.replaceAll("_", " ").toLowerCase()}.` });
      return updated;
    }

    if (input.action === "suspend" || input.action === "restrict") {
      if (target.role === "SUPER_ADMIN") await assertAnotherSuperAdmin(tx, target.id);
      const startsAt = input.action === "suspend" && input.startsAt ? new Date(input.startsAt) : new Date();
      const endsAt = input.action === "suspend" && input.endsAt ? new Date(input.endsAt) : null;
      if (endsAt && endsAt <= startsAt) throw new AdminError("Suspension end must be after its start.", 400);
      if (endsAt && endsAt <= new Date()) throw new AdminError("Suspension end must be in the future.", 400);
      const status = input.action === "suspend" ? "SUSPENDED" : "RESTRICTED";
      const updated = await tx.user.update({ where: { id: userId }, data: { status, suspendedUntil: endsAt, suspensionReason: input.reason }, select: { status: true, suspendedUntil: true } });
      await tx.moderationAction.create({ data: { userId, adminId, action: input.action === "suspend" ? "SUSPEND" : "RESTRICT", reason: input.reason, startsAt, endsAt } });
      await recordAudit(tx, { adminId, action: input.action === "suspend" ? "USER_SUSPENDED" : "USER_RESTRICTED", targetType: "User", targetId: userId, previousValue: previous, newValue: updated, reason: input.reason });
      await notifyUsers(tx, [userId], { type: "ACCOUNT_MODERATION", title: input.action === "suspend" ? "Your account has been suspended" : "Your account has been restricted", body: `${input.reason}${endsAt ? ` (until ${endsAt.toUTCString()})` : ""}` });
      await notifySuperAdmins(tx, { type: "ADMIN_MODERATION", title: `${target.name} was ${input.action === "suspend" ? "suspended" : "restricted"}`, body: input.reason, link: `/admin/users/${userId}` }, adminId);
      return updated;
    }

    if (input.action === "reactivate") {
      if (target.status === "ACTIVE") throw new AdminError("This account is already active.", 409);
      const updated = await tx.user.update({ where: { id: userId }, data: { status: "ACTIVE", suspendedUntil: null, suspensionReason: null }, select: { status: true } });
      await tx.moderationAction.create({ data: { userId, adminId, action: "REACTIVATE", reason: input.reason } });
      await recordAudit(tx, { adminId, action: "USER_REACTIVATED", targetType: "User", targetId: userId, previousValue: previous, newValue: updated, reason: input.reason });
      await notifyUsers(tx, [userId], { type: "ACCOUNT_MODERATION", title: "Your account has been reactivated" });
      await notifySuperAdmins(tx, { type: "ADMIN_MODERATION", title: `${target.name} was reactivated`, body: input.reason, link: `/admin/users/${userId}` }, adminId);
      return updated;
    }

    // Soft delete: historical matches and tournaments keep referencing the
    // user row, while personal data and credentials are removed.
    if (input.confirmEmail.toLowerCase() !== target.email.toLowerCase()) throw new AdminError("Type the user's email address to confirm deletion.", 400);
    if (target.role === "SUPER_ADMIN") await assertAnotherSuperAdmin(tx, target.id);
    const now = new Date();
    await tx.session.deleteMany({ where: { userId } });
    await tx.account.deleteMany({ where: { userId } });
    await tx.verification.deleteMany({ where: { userId } });
    await tx.tournamentParticipant.updateMany({ where: { userId, status: { in: ["PENDING"] } }, data: { status: "WITHDRAWN" } });
    await tx.playerProfile.updateMany({ where: { userId }, data: { fullName: "Deleted player", bio: null, city: null, country: null, clubName: null, profileImage: null, publicId: null, dateOfBirth: null, isPublic: false } });
    await tx.user.update({ where: { id: userId }, data: { status: "DELETED", deletedAt: now, name: "Deleted user", email: `deleted+${userId}@deleted.invalid`, image: null, suspendedUntil: null, suspensionReason: input.reason } });
    await tx.moderationAction.create({ data: { userId, adminId, action: "DELETE", reason: input.reason } });
    await recordAudit(tx, { adminId, action: "USER_DELETED", targetType: "User", targetId: userId, previousValue: { ...previous, name: target.name, email: target.email }, newValue: { status: "DELETED", deletedAt: now }, reason: input.reason });
    return { status: "DELETED" as const };
  });
}
