import "server-only";

import type { AdminAuditAction, Prisma } from "@/generated/prisma";
import { AdminError } from "@/lib/admin/errors";
import { pageArgs, pageMeta } from "@/lib/admin/pagination";
import { getPrismaClient } from "@/lib/prisma";

function db() {
  const prisma = getPrismaClient();
  if (!prisma) throw new AdminError("Database unavailable.", 503);
  return prisma;
}

export async function getAdminOverview(now = new Date()) {
  const prisma = db();
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000);
  const monthAgo = new Date(now.getTime() - 30 * 86_400_000);
  const notDeleted = { status: { not: "DELETED" as const } };
  const [
    totalUsers, activeUsers, suspendedUsers, restrictedUsers, newUsers, completedProfiles,
    matchGroups, matchesWeek, matchesMonth,
    tournamentGroups, upcomingTournaments,
    openReports, matchesUnderReview,
    recentUsers, recentMatches, recentTournaments, recentAudit,
  ] = await Promise.all([
    prisma.user.count({ where: notDeleted }),
    prisma.user.count({ where: { status: "ACTIVE", OR: [{ lastActiveAt: { gte: monthAgo } }, { sessions: { some: { expiresAt: { gt: now } } } }] } }),
    prisma.user.count({ where: { status: "SUSPENDED", OR: [{ suspendedUntil: null }, { suspendedUntil: { gt: now } }] } }),
    prisma.user.count({ where: { status: "RESTRICTED" } }),
    prisma.user.count({ where: { ...notDeleted, createdAt: { gte: weekAgo } } }),
    prisma.playerProfile.count({ where: { user: notDeleted, fullName: { not: "" }, country: { not: null }, city: { not: null }, playingHand: { not: null }, playingStyle: { not: null } } }),
    prisma.match.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.match.count({ where: { status: "COMPLETED", completedAt: { gte: weekAgo } } }),
    prisma.match.count({ where: { status: "COMPLETED", completedAt: { gte: monthAgo } } }),
    prisma.tournament.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.tournament.count({ where: { status: { in: ["OPEN_REGISTRATION", "REGISTRATION_CLOSED"] }, startDate: { gt: now } } }),
    prisma.userReport.count({ where: { status: { in: ["PENDING", "UNDER_REVIEW"] } } }),
    prisma.match.count({ where: { reviewStatus: "UNDER_REVIEW" } }),
    prisma.user.findMany({ where: notDeleted, orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, email: true, createdAt: true, role: true } }),
    prisma.match.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, status: true, createdAt: true, player1: { select: { name: true } }, player2: { select: { name: true } } } }),
    prisma.tournament.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, name: true, status: true, createdAt: true } }),
    prisma.adminAuditLog.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { admin: { select: { name: true } } } }),
  ]);
  const byStatus = <T extends string>(rows: Array<{ status: T; _count: { _all: number } }>) => Object.fromEntries(rows.map((row) => [row.status, row._count._all])) as Partial<Record<T, number>>;
  const matches = byStatus(matchGroups);
  const tournaments = byStatus(tournamentGroups);
  return {
    users: { total: totalUsers, active: activeUsers, suspended: suspendedUsers, restricted: restrictedUsers, newThisWeek: newUsers, completedProfiles },
    matches: { total: Object.values(matches).reduce((sum, value) => sum + (value ?? 0), 0), completed: matches.COMPLETED ?? 0, ongoing: matches.IN_PROGRESS ?? 0, scheduled: matches.SCHEDULED ?? 0, cancelled: (matches.CANCELLED ?? 0) + (matches.ABANDONED ?? 0), thisWeek: matchesWeek, thisMonth: matchesMonth, underReview: matchesUnderReview },
    tournaments: { total: Object.values(tournaments).reduce((sum, value) => sum + (value ?? 0), 0), upcoming: upcomingTournaments, ongoing: tournaments.IN_PROGRESS ?? 0, completed: tournaments.COMPLETED ?? 0, cancelled: tournaments.CANCELLED ?? 0 },
    openReports,
    recent: { users: recentUsers, matches: recentMatches, tournaments: recentTournaments, audit: recentAudit },
  };
}

export const AUDIT_ACTIONS = ["USER_ROLE_CHANGED", "USER_SUSPENDED", "USER_RESTRICTED", "USER_REACTIVATED", "USER_DELETED", "PLAYER_PROFILE_CORRECTED", "MATCH_REVIEW_UPDATED", "MATCH_CANCELLED", "MATCH_RESULT_CORRECTED", "TOURNAMENT_CANCELLED", "TOURNAMENT_UPDATED", "REPORT_STATUS_CHANGED", "REPORT_NOTE_ADDED", "SETTINGS_UPDATED"] as const;

export async function listAuditLogs(filters: { action?: string; targetType?: string; q?: string; page: number }) {
  const prisma = db();
  const where: Prisma.AdminAuditLogWhereInput = {
    ...((AUDIT_ACTIONS as readonly string[]).includes(filters.action ?? "") ? { action: filters.action as AdminAuditAction } : {}),
    ...(filters.targetType ? { targetType: filters.targetType } : {}),
    ...(filters.q ? { OR: [{ targetId: filters.q }, { reason: { contains: filters.q, mode: "insensitive" } }, { admin: { name: { contains: filters.q, mode: "insensitive" } } }] } : {}),
  };
  const [total, logs] = await Promise.all([
    prisma.adminAuditLog.count({ where }),
    prisma.adminAuditLog.findMany({ where, orderBy: { createdAt: "desc" }, include: { admin: { select: { id: true, name: true } } }, ...pageArgs(filters.page) }),
  ]);
  return { meta: pageMeta(total, filters.page), logs };
}

export async function listModeration(filters: { page: number }) {
  const prisma = db();
  const now = new Date();
  const [restricted, total, actions] = await Promise.all([
    prisma.user.findMany({ where: { OR: [{ status: "RESTRICTED" }, { status: "SUSPENDED", OR: [{ suspendedUntil: null }, { suspendedUntil: { gt: now } }] }] }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, name: true, email: true, status: true, suspendedUntil: true, suspensionReason: true } }),
    prisma.moderationAction.count(),
    prisma.moderationAction.findMany({ orderBy: { createdAt: "desc" }, include: { user: { select: { id: true, name: true } }, admin: { select: { name: true } } }, ...pageArgs(filters.page) }),
  ]);
  return { restricted, meta: pageMeta(total, filters.page), actions };
}
