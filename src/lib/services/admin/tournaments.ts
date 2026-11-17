import "server-only";

import { z } from "zod";

import type { Prisma, TournamentFormat, TournamentStatus } from "@/generated/prisma";
import { AdminError } from "@/lib/admin/errors";
import { pageArgs, pageMeta } from "@/lib/admin/pagination";
import { getPrismaClient } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit-log";
import { notifyUsers } from "@/lib/services/notifications";
import { cancelTournament } from "@/lib/services/tournaments";

const STATUSES = ["DRAFT", "OPEN_REGISTRATION", "REGISTRATION_CLOSED", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const;
const FORMATS = ["SINGLE_ELIMINATION", "ROUND_ROBIN"] as const;

export const tournamentAdminActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3).max(500) }),
  z.object({
    action: z.literal("update"),
    reason: z.string().trim().min(3).max(500),
    name: z.string().trim().min(3).max(120).optional(),
    description: z.string().trim().max(2000).optional(),
    location: z.string().trim().max(200).optional(),
    rules: z.string().trim().max(5000).optional(),
    bannerImage: z.union([z.literal(""), z.url({ protocol: /^https?$/ }).max(2048)]).optional(),
  }),
]);

function db() {
  const prisma = getPrismaClient();
  if (!prisma) throw new AdminError("Database unavailable.", 503);
  return prisma;
}

export async function listTournamentsForAdmin(filters: { q?: string; status?: string; format?: string; page: number }) {
  const prisma = db();
  const where: Prisma.TournamentWhereInput = {
    ...(filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" } }, { location: { contains: filters.q, mode: "insensitive" } }, { createdBy: { name: { contains: filters.q, mode: "insensitive" } } }] } : {}),
    ...((STATUSES as readonly string[]).includes(filters.status ?? "") ? { status: filters.status as TournamentStatus } : {}),
    ...((FORMATS as readonly string[]).includes(filters.format ?? "") ? { format: filters.format as TournamentFormat } : {}),
  };
  const [total, tournaments] = await Promise.all([
    prisma.tournament.count({ where }),
    prisma.tournament.findMany({
      where,
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, status: true, format: true, startDate: true, maxParticipants: true, createdBy: { select: { id: true, name: true, email: true } }, winner: { select: { name: true } }, _count: { select: { participants: true, fixtures: true, reports: true } } },
      ...pageArgs(filters.page),
    }),
  ]);
  return { meta: pageMeta(total, filters.page), tournaments };
}

export async function getTournamentAdminDetail(tournamentId: string) {
  const prisma = db();
  const userSelect = { id: true, name: true, email: true } as const;
  return prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      createdBy: { select: userSelect },
      winner: { select: userSelect },
      runnerUp: { select: userSelect },
      participants: { orderBy: { registeredAt: "asc" }, include: { user: { select: userSelect } } },
      rounds: { orderBy: { number: "asc" }, include: { fixtures: { orderBy: { position: "asc" }, include: { player1: { select: userSelect }, player2: { select: userSelect }, match: { select: { id: true, status: true, reviewStatus: true, player1GamesWon: true, player2GamesWon: true } } } } } },
      reports: { orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, createdAt: true } },
    },
  });
}

export async function performTournamentAdminAction(adminId: string, tournamentId: string, input: z.infer<typeof tournamentAdminActionSchema>) {
  const prisma = db();
  const current = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!current) throw new AdminError("Tournament not found.", 404);

  if (input.action === "cancel") {
    if (current.status === "CANCELLED") throw new AdminError("This tournament is already cancelled.", 409);
    if (current.status === "COMPLETED") throw new AdminError("Completed tournaments cannot be cancelled.", 409);
    // Reuse the organizer cancellation workflow (abandons unfinished matches) so progression rules stay consistent.
    await cancelTournament(adminId, tournamentId);
    await prisma.$transaction(async (tx) => {
      await recordAudit(tx, { adminId, action: "TOURNAMENT_CANCELLED", targetType: "Tournament", targetId: tournamentId, previousValue: { status: current.status }, newValue: { status: "CANCELLED" }, reason: input.reason });
      await notifyUsers(tx, [current.createdById], { type: "TOURNAMENT_CANCELLED", title: `${current.name} was cancelled by an administrator`, body: input.reason, link: `/tournaments/${tournamentId}` });
    });
    return { status: "CANCELLED" as const };
  }

  const { reason, action: _action, ...fields } = input;
  void _action;
  const previous: Record<string, unknown> = {};
  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields) as Array<[keyof typeof fields, string | undefined]>) {
    if (value === undefined) continue;
    const normalized = key === "name" ? value : value || null;
    if (current[key] === normalized) continue;
    previous[key] = current[key];
    next[key] = normalized;
  }
  if (!Object.keys(next).length) throw new AdminError("No tournament changes to save.", 400);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.tournament.update({ where: { id: tournamentId }, data: next });
    await recordAudit(tx, { adminId, action: "TOURNAMENT_UPDATED", targetType: "Tournament", targetId: tournamentId, previousValue: previous, newValue: next, reason });
    return updated;
  });
}
