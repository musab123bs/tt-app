import "server-only";

import { z } from "zod";

import type { Prisma, ReportStatus, ReportType } from "@/generated/prisma";
import { AdminError } from "@/lib/admin/errors";
import { pageArgs, pageMeta } from "@/lib/admin/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit-log";
import { notifySuperAdmins } from "@/lib/services/admin/notify";
import { notifyUsers } from "@/lib/services/notifications";

export const REPORT_TYPES = ["INCORRECT_RESULT", "SUSPICIOUS_ACTIVITY", "INAPPROPRIATE_PROFILE", "TOURNAMENT_DISPUTE", "OTHER"] as const;
export const REPORT_STATUSES = ["PENDING", "UNDER_REVIEW", "RESOLVED", "REJECTED"] as const;
export const reportTypeLabels: Record<(typeof REPORT_TYPES)[number], string> = {
  INCORRECT_RESULT: "Incorrect match result",
  SUSPICIOUS_ACTIVITY: "Suspicious match activity",
  INAPPROPRIATE_PROFILE: "Inappropriate player profile",
  TOURNAMENT_DISPUTE: "Tournament dispute",
  OTHER: "Other platform issue",
};

export const reportCreateSchema = z.object({
  type: z.enum(REPORT_TYPES),
  description: z.string().trim().min(10, "Describe the issue in at least 10 characters.").max(2000),
  matchId: z.string().trim().min(1).max(64).optional(),
  tournamentId: z.string().trim().min(1).max(64).optional(),
  targetUserId: z.string().trim().min(1).max(64).optional(),
}).refine((value) => value.type !== "INCORRECT_RESULT" && value.type !== "SUSPICIOUS_ACTIVITY" || value.matchId, { message: "Choose the match you are reporting.", path: ["matchId"] })
  .refine((value) => value.type !== "TOURNAMENT_DISPUTE" || value.tournamentId, { message: "Choose the tournament you are reporting.", path: ["tournamentId"] })
  .refine((value) => value.type !== "INAPPROPRIATE_PROFILE" || value.targetUserId, { message: "Choose the player you are reporting.", path: ["targetUserId"] });

export const reportUpdateSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(REPORT_STATUSES), note: z.string().trim().max(2000).optional(), resolution: z.string().trim().max(2000).optional() }),
  z.object({ action: z.literal("note"), note: z.string().trim().min(1).max(2000) }),
]);

function db() {
  const prisma = getPrismaClient();
  if (!prisma) throw new AdminError("Database unavailable.", 503);
  return prisma;
}

export async function createReport(reporterId: string, input: z.infer<typeof reportCreateSchema>) {
  const prisma = db();
  return prisma.$transaction(async (tx) => {
    const [match, tournament, target] = await Promise.all([
      input.matchId ? tx.match.findUnique({ where: { id: input.matchId }, select: { id: true, player1Id: true, player2Id: true } }) : null,
      input.tournamentId ? tx.tournament.findUnique({ where: { id: input.tournamentId }, select: { id: true, name: true } }) : null,
      input.targetUserId ? tx.user.findUnique({ where: { id: input.targetUserId }, select: { id: true } }) : null,
    ]);
    if (input.matchId && !match) throw new AdminError("The reported match was not found.", 404);
    if (input.tournamentId && !tournament) throw new AdminError("The reported tournament was not found.", 404);
    if (input.targetUserId && !target) throw new AdminError("The reported player was not found.", 404);
    if (input.targetUserId === reporterId) throw new AdminError("You cannot report your own profile.", 400);
    const duplicate = await tx.userReport.findFirst({ where: { reporterId, type: input.type, matchId: input.matchId ?? null, tournamentId: input.tournamentId ?? null, targetUserId: input.targetUserId ?? null, status: { in: ["PENDING", "UNDER_REVIEW"] } }, select: { id: true } });
    if (duplicate) throw new AdminError("You already have an open report for this. An administrator will review it.", 409);
    const report = await tx.userReport.create({
      data: { reporterId, type: input.type, description: input.description, matchId: match?.id, tournamentId: tournament?.id, targetUserId: target?.id ?? null },
    });
    await tx.reportEvent.create({ data: { reportId: report.id, actorId: reporterId, kind: "CREATED", toStatus: "PENDING", internal: false } });
    const title = input.type === "INCORRECT_RESULT" ? "New match dispute" : input.type === "TOURNAMENT_DISPUTE" ? `New tournament report${tournament ? `: ${tournament.name}` : ""}` : input.type === "SUSPICIOUS_ACTIVITY" ? "Suspicious activity reported" : `New report: ${reportTypeLabels[input.type]}`;
    await notifySuperAdmins(tx, { type: "ADMIN_REPORT", title, body: input.description.slice(0, 160), link: `/admin/reports/${report.id}`, dedupeKey: `report:${report.id}` });
    return report;
  });
}

export async function listMyReports(reporterId: string) {
  return db().userReport.findMany({ where: { reporterId }, orderBy: { createdAt: "desc" }, take: 20, select: { id: true, type: true, status: true, resolution: true, createdAt: true, updatedAt: true } });
}

export async function listReports(filters: { status?: string; type?: string; page: number }) {
  const prisma = db();
  const where: Prisma.UserReportWhereInput = {
    ...((REPORT_STATUSES as readonly string[]).includes(filters.status ?? "") ? { status: filters.status as ReportStatus } : {}),
    ...((REPORT_TYPES as readonly string[]).includes(filters.type ?? "") ? { type: filters.type as ReportType } : {}),
  };
  const [total, reports] = await Promise.all([
    prisma.userReport.count({ where }),
    prisma.userReport.findMany({ where, orderBy: [{ status: "asc" }, { createdAt: "desc" }], include: { reporter: { select: { id: true, name: true } } }, ...pageArgs(filters.page) }),
  ]);
  return { meta: pageMeta(total, filters.page), reports };
}

export async function getReportDetail(reportId: string) {
  const userSelect = { id: true, name: true, email: true } as const;
  return db().userReport.findUnique({
    where: { id: reportId },
    include: {
      reporter: { select: userSelect },
      targetUser: { select: { ...userSelect, status: true } },
      assignedTo: { select: userSelect },
      match: { select: { id: true, status: true, reviewStatus: true, player1GamesWon: true, player2GamesWon: true, player1: { select: userSelect }, player2: { select: userSelect } } },
      tournament: { select: { id: true, name: true, status: true } },
      events: { orderBy: { createdAt: "asc" }, include: { actor: { select: { name: true } } } },
    },
  });
}

export async function updateReport(adminId: string, reportId: string, input: z.infer<typeof reportUpdateSchema>) {
  const prisma = db();
  return prisma.$transaction(async (tx) => {
    const report = await tx.userReport.findUnique({ where: { id: reportId } });
    if (!report) throw new AdminError("Report not found.", 404);
    if (input.action === "note") {
      const event = await tx.reportEvent.create({ data: { reportId, actorId: adminId, kind: "NOTE", note: input.note, internal: true } });
      await recordAudit(tx, { adminId, action: "REPORT_NOTE_ADDED", targetType: "UserReport", targetId: reportId, newValue: { note: input.note } });
      return event;
    }
    if (input.status === report.status) throw new AdminError("The report already has this status.", 409);
    const closing = input.status === "RESOLVED" || input.status === "REJECTED";
    if (closing && !input.resolution?.trim()) throw new AdminError("Record a resolution reason before resolving or rejecting a report.", 400);
    const updated = await tx.userReport.update({
      where: { id: reportId },
      data: { status: input.status, assignedToId: report.assignedToId ?? adminId, resolution: closing ? input.resolution!.trim() : report.resolution, resolvedAt: closing ? new Date() : null },
    });
    await tx.reportEvent.create({ data: { reportId, actorId: adminId, kind: "STATUS_CHANGE", fromStatus: report.status, toStatus: input.status, note: input.note || (closing ? input.resolution : null) || null, internal: true } });
    await recordAudit(tx, { adminId, action: "REPORT_STATUS_CHANGED", targetType: "UserReport", targetId: reportId, previousValue: { status: report.status, resolution: report.resolution }, newValue: { status: updated.status, resolution: updated.resolution }, reason: input.resolution || input.note });
    if (closing || input.status === "UNDER_REVIEW") {
      await notifyUsers(tx, [report.reporterId], { type: "REPORT_UPDATE", title: `Your report is ${input.status.replaceAll("_", " ").toLowerCase()}`, body: closing ? input.resolution : null, link: "/reports", dedupeKey: `report-status:${reportId}:${input.status}` });
    }
    return updated;
  });
}
