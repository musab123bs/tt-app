import "server-only";

import { z } from "zod";

import type { PlayerLevel, Prisma } from "@/generated/prisma";
import { AdminError } from "@/lib/admin/errors";
import { pageArgs, pageMeta } from "@/lib/admin/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit-log";
import { notifyUsers } from "@/lib/services/notifications";
import { PLAYER_LEVELS } from "@/lib/services/platform-settings";

export const profileCorrectionSchema = z.object({
  fullName: z.string().trim().min(2).max(100).optional(),
  bio: z.string().trim().max(500).optional(),
  country: z.string().trim().max(80).optional(),
  city: z.string().trim().max(80).optional(),
  clubName: z.string().trim().max(120).optional(),
  level: z.enum(PLAYER_LEVELS).optional(),
  isPublic: z.boolean().optional(),
  removeImage: z.boolean().optional(),
  reason: z.string().trim().min(3).max(500),
});

function db() {
  const prisma = getPrismaClient();
  if (!prisma) throw new AdminError("Database unavailable.", 503);
  return prisma;
}

export async function listPlayers(filters: { q?: string; level?: string; page: number }) {
  const prisma = db();
  const where: Prisma.PlayerProfileWhereInput = {
    user: { status: { not: "DELETED" } },
    ...(filters.q ? { OR: [{ fullName: { contains: filters.q, mode: "insensitive" } }, { user: { email: { contains: filters.q, mode: "insensitive" } } }, { clubName: { contains: filters.q, mode: "insensitive" } }] } : {}),
    ...((PLAYER_LEVELS as readonly string[]).includes(filters.level ?? "") ? { level: filters.level as PlayerLevel } : {}),
  };
  const [total, profiles] = await Promise.all([
    prisma.playerProfile.count({ where }),
    prisma.playerProfile.findMany({ where, include: { user: { select: { id: true, email: true, status: true, role: true, image: true } } }, orderBy: { createdAt: "desc" }, ...pageArgs(filters.page) }),
  ]);
  const ids = profiles.map((profile) => profile.userId);
  const [asP1, asP2, wins, tournaments] = await Promise.all([
    prisma.match.groupBy({ by: ["player1Id"], where: { player1Id: { in: ids }, status: "COMPLETED" }, _count: { _all: true } }),
    prisma.match.groupBy({ by: ["player2Id"], where: { player2Id: { in: ids }, status: "COMPLETED" }, _count: { _all: true } }),
    prisma.match.groupBy({ by: ["winnerId"], where: { winnerId: { in: ids }, status: "COMPLETED" }, _count: { _all: true } }),
    prisma.tournamentParticipant.groupBy({ by: ["userId"], where: { userId: { in: ids }, status: { in: ["APPROVED", "WITHDRAWN", "REMOVED"] } }, _count: { _all: true } }),
  ]);
  const count = (rows: Array<{ _count: { _all: number } } & Record<string, unknown>>, key: string) => new Map(rows.map((row) => [row[key] as string, row._count._all]));
  const p1 = count(asP1, "player1Id"); const p2 = count(asP2, "player2Id"); const won = count(wins, "winnerId"); const entered = count(tournaments, "userId");
  return {
    meta: pageMeta(total, filters.page),
    players: profiles.map((profile) => {
      const played = (p1.get(profile.userId) ?? 0) + (p2.get(profile.userId) ?? 0);
      return {
        id: profile.userId,
        name: profile.fullName,
        email: profile.user.email,
        image: profile.profileImage || profile.user.image,
        level: profile.level,
        isPublic: profile.isPublic,
        status: profile.user.status,
        played,
        won: won.get(profile.userId) ?? 0,
        tournaments: entered.get(profile.userId) ?? 0,
      };
    }),
  };
}

export async function getPlayerAdminDetail(userId: string) {
  const prisma = db();
  const profile = await prisma.playerProfile.findUnique({ where: { userId }, include: { user: { select: { id: true, email: true, status: true, role: true, image: true, createdAt: true } } } });
  if (!profile) return null;
  const playerSelect = { id: true, name: true, playerProfile: { select: { fullName: true } } } as const;
  const [matches, completed, won, participations, corrections] = await Promise.all([
    prisma.match.findMany({ where: { OR: [{ player1Id: userId }, { player2Id: userId }] }, orderBy: { scheduledAt: "desc" }, take: 15, select: { id: true, status: true, scheduledAt: true, winnerId: true, player1GamesWon: true, player2GamesWon: true, player1: { select: playerSelect }, player2: { select: playerSelect } } }),
    prisma.match.count({ where: { status: "COMPLETED", OR: [{ player1Id: userId }, { player2Id: userId }] } }),
    prisma.match.count({ where: { status: "COMPLETED", winnerId: userId } }),
    prisma.tournamentParticipant.findMany({ where: { userId }, orderBy: { registeredAt: "desc" }, take: 20, select: { id: true, status: true, tournament: { select: { id: true, name: true, status: true, winnerId: true, runnerUpId: true } } } }),
    prisma.adminAuditLog.findMany({ where: { targetType: "PlayerProfile", targetId: userId }, orderBy: { createdAt: "desc" }, take: 20, include: { admin: { select: { name: true } } } }),
  ]);
  return { profile, stats: { completed, won, lost: completed - won, winPercentage: completed ? Math.round((won / completed) * 100) : 0 }, matches, participations, corrections };
}

export async function correctPlayerProfile(adminId: string, userId: string, input: z.infer<typeof profileCorrectionSchema>) {
  const prisma = db();
  return prisma.$transaction(async (tx) => {
    const profile = await tx.playerProfile.findUnique({ where: { userId }, include: { user: { select: { isSystemAccount: true, status: true } } } });
    if (!profile) throw new AdminError("Player profile not found.", 404);
    if (profile.user.status === "DELETED") throw new AdminError("Deleted profiles cannot be edited.", 409);
    const { reason, removeImage, ...fields } = input;
    const data: Prisma.PlayerProfileUpdateInput = {};
    const previous: Record<string, unknown> = {};
    const next: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(fields) as Array<[keyof typeof fields, unknown]>) {
      if (value === undefined) continue;
      const normalized = typeof value === "string" && key !== "fullName" ? value || null : value;
      if (profile[key] === normalized) continue;
      previous[key] = profile[key];
      next[key] = normalized;
      Object.assign(data, { [key]: normalized });
    }
    if (removeImage && profile.profileImage) {
      previous.profileImage = profile.profileImage;
      next.profileImage = null;
      Object.assign(data, { profileImage: null, publicId: null });
    }
    if (!Object.keys(next).length) throw new AdminError("No profile changes to save.", 400);
    const updated = await tx.playerProfile.update({ where: { userId }, data });
    await recordAudit(tx, { adminId, action: "PLAYER_PROFILE_CORRECTED", targetType: "PlayerProfile", targetId: userId, previousValue: previous, newValue: next, reason });
    await notifyUsers(tx, [userId], { type: "ACCOUNT_MODERATION", title: "An administrator updated your player profile", body: reason, link: "/profile" });
    return updated;
  });
}
