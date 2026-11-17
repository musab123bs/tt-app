import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma";
import { notifyUsers, type NotificationInput } from "@/lib/services/notifications";

export async function notifySuperAdmins(db: Prisma.TransactionClient | PrismaClient, input: NotificationInput, excludeUserId?: string) {
  const admins = await db.user.findMany({ where: { role: "SUPER_ADMIN", status: "ACTIVE", ...(excludeUserId ? { id: { not: excludeUserId } } : {}) }, select: { id: true } });
  return notifyUsers(db, admins.map((admin) => admin.id), input);
}
