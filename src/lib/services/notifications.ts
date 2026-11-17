import "server-only";

import type { NotificationType, Prisma, PrismaClient } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/prisma";

type Db = Prisma.TransactionClient | PrismaClient;

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body?: string | null;
  link?: string | null;
  dedupeKey?: string | null;
};

export async function notifyUsers(db: Db, userIds: Array<string | null | undefined>, input: NotificationInput) {
  const recipients = [...new Set(userIds.filter((id): id is string => Boolean(id)))];
  if (!recipients.length) return 0;
  const result = await db.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      dedupeKey: input.dedupeKey ?? null,
    })),
    skipDuplicates: true,
  });
  return result.count;
}

export async function getUserNotifications(userId: string, take = 50) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const [items, unread] = await Promise.all([
    prisma.notification.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: Math.min(Math.max(take, 1), 100) }),
    prisma.notification.count({ where: { userId, readAt: null } }),
  ]);
  return {
    unread,
    items: items.map((item) => ({
      id: item.id,
      type: item.type,
      title: item.title,
      body: item.body,
      link: item.link,
      readAt: item.readAt?.toISOString() ?? null,
      createdAt: item.createdAt.toISOString(),
    })),
  };
}

export async function markNotificationsRead(userId: string, ids?: string[]) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const result = await prisma.notification.updateMany({
    where: { userId, readAt: null, ...(ids?.length ? { id: { in: ids } } : {}) },
    data: { readAt: new Date() },
  });
  return result.count;
}
