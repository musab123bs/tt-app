import "server-only";

import { z } from "zod";

import type { MatchStatus, Prisma } from "@/generated/prisma";
import { AdminError } from "@/lib/admin/errors";
import { pageArgs, pageMeta } from "@/lib/admin/pagination";
import { getGameWinner, getMatchWinner } from "@/lib/matches/scoring";
import { getPrismaClient } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit-log";
import { notifyUsers } from "@/lib/services/notifications";
import { markTournamentMatchAbandoned } from "@/lib/services/tournament-match-sync";
import { calculateRoundRobinStandings, DEFAULT_TIE_BREAK_ORDER, getNextEliminationSlot, type TieBreakRule } from "@/lib/tournaments/formats";

export const MATCH_STATUSES = ["SCHEDULED", "IN_PROGRESS", "COMPLETED", "ABANDONED", "CANCELLED"] as const;

export const matchActionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("review"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("clear_review"), reason: z.string().trim().min(3).max(500) }),
  z.object({ action: z.literal("cancel"), reason: z.string().trim().min(3).max(500) }),
  z.object({
    action: z.literal("correct"),
    reason: z.string().trim().min(3).max(500),
    games: z.array(z.object({ player1Score: z.number().int().min(0).max(99), player2Score: z.number().int().min(0).max(99) })).min(1).max(7),
  }),
]);
export type MatchAction = z.infer<typeof matchActionSchema>;

function db() {
  const prisma = getPrismaClient();
  if (!prisma) throw new AdminError("Database unavailable.", 503);
  return prisma;
}

const playerSelect = { id: true, name: true, email: true, playerProfile: { select: { fullName: true } } } as const;

export async function listMatches(filters: { q?: string; status?: string; from?: string; to?: string; review?: string; page: number }) {
  const prisma = db();
  const from = filters.from ? new Date(filters.from) : null;
  const to = filters.to ? new Date(`${filters.to}T23:59:59.999Z`) : null;
  const playerMatch = filters.q ? { OR: [{ name: { contains: filters.q, mode: "insensitive" as const } }, { email: { contains: filters.q, mode: "insensitive" as const } }, { playerProfile: { is: { fullName: { contains: filters.q, mode: "insensitive" as const } } } }] } : null;
  const where: Prisma.MatchWhereInput = {
    ...(playerMatch ? { OR: [{ player1: playerMatch }, { player2: playerMatch }] } : {}),
    ...((MATCH_STATUSES as readonly string[]).includes(filters.status ?? "") ? { status: filters.status as MatchStatus } : {}),
    ...(filters.review === "UNDER_REVIEW" ? { reviewStatus: "UNDER_REVIEW" } : {}),
    ...(from && !Number.isNaN(from.getTime()) || to && !Number.isNaN(to.getTime()) ? { scheduledAt: { ...(from && !Number.isNaN(from.getTime()) ? { gte: from } : {}), ...(to && !Number.isNaN(to.getTime()) ? { lte: to } : {}) } } : {}),
  };
  const [total, matches] = await Promise.all([
    prisma.match.count({ where }),
    prisma.match.findMany({
      where,
      orderBy: { scheduledAt: "desc" },
      select: { id: true, status: true, reviewStatus: true, scheduledAt: true, bestOf: true, player1GamesWon: true, player2GamesWon: true, winnerId: true, player1: { select: playerSelect }, player2: { select: playerSelect }, tournamentFixture: { select: { tournament: { select: { id: true, name: true } } } }, _count: { select: { reports: true, corrections: true } } },
      ...pageArgs(filters.page),
    }),
  ]);
  return { meta: pageMeta(total, filters.page), matches };
}

export async function getMatchAdminDetail(matchId: string) {
  const prisma = db();
  return prisma.match.findUnique({
    where: { id: matchId },
    include: {
      player1: { select: playerSelect },
      player2: { select: playerSelect },
      createdBy: { select: playerSelect },
      games: { orderBy: { number: "asc" }, include: { _count: { select: { points: true } } } },
      corrections: { orderBy: { createdAt: "desc" }, include: { admin: { select: { name: true } } } },
      reports: { orderBy: { createdAt: "desc" }, select: { id: true, type: true, status: true, createdAt: true } },
      tournamentFixture: { select: { id: true, status: true, round: { select: { label: true, number: true } }, tournament: { select: { id: true, name: true, format: true, status: true } } } },
    },
  });
}

function snapshot(match: { status: string; winnerId: string | null; loserId: string | null; player1GamesWon: number; player2GamesWon: number; player1TotalPoints: number; player2TotalPoints: number; games: Array<{ number: number; player1Score: number; player2Score: number; winnerId: string | null; _count?: { points: number } }> }) {
  return {
    status: match.status,
    winnerId: match.winnerId,
    loserId: match.loserId,
    player1GamesWon: match.player1GamesWon,
    player2GamesWon: match.player2GamesWon,
    player1TotalPoints: match.player1TotalPoints,
    player2TotalPoints: match.player2TotalPoints,
    games: match.games.map((game) => ({ number: game.number, player1Score: game.player1Score, player2Score: game.player2Score, winnerId: game.winnerId, recordedPoints: game._count?.points })),
  };
}

export function validateCorrectedGames(games: Array<{ player1Score: number; player2Score: number }>, bestOf: number) {
  let player1GamesWon = 0;
  let player2GamesWon = 0;
  games.forEach((game, index) => {
    const winner = getGameWinner(game.player1Score, game.player2Score);
    if (!winner) throw new AdminError(`Game ${index + 1} is not a valid finished game (11 points with a two point lead).`, 400);
    if (Math.max(game.player1Score, game.player2Score) > 11 && Math.abs(game.player1Score - game.player2Score) !== 2) {
      throw new AdminError(`Game ${index + 1}: deuce games must finish with exactly a two point margin.`, 400);
    }
    if (getMatchWinner(player1GamesWon, player2GamesWon, bestOf)) throw new AdminError("The match was already decided before the last game entered.", 400);
    if (winner === 1) player1GamesWon += 1; else player2GamesWon += 1;
  });
  const winner = getMatchWinner(player1GamesWon, player2GamesWon, bestOf);
  if (!winner) throw new AdminError(`A best-of-${bestOf} match needs a winner. Add the remaining games.`, 400);
  return { winner, player1GamesWon, player2GamesWon };
}

async function syncTournamentAfterCorrection(tx: Prisma.TransactionClient, matchId: string, previousWinnerId: string | null, winnerId: string, loserId: string) {
  const fixture = await tx.tournamentFixture.findUnique({ where: { matchId }, include: { tournament: true, round: true } });
  if (!fixture || !fixture.resultProcessedAt) return null;
  if (fixture.tournament.status === "CANCELLED") throw new AdminError("Results in cancelled tournaments cannot be corrected.", 409);
  if (previousWinnerId === winnerId) {
    if (fixture.tournament.format === "ROUND_ROBIN") await refreshRoundRobinResult(tx, fixture.tournamentId);
    return { fixtureId: fixture.id, winnerChanged: false };
  }
  if (fixture.tournament.format === "SINGLE_ELIMINATION") {
    const totalRounds = await tx.tournamentRound.count({ where: { tournamentId: fixture.tournamentId } });
    if (fixture.round.number < totalRounds) {
      const slot = getNextEliminationSlot(fixture.position);
      const nextRound = await tx.tournamentRound.findUniqueOrThrow({ where: { tournamentId_number: { tournamentId: fixture.tournamentId, number: fixture.round.number + 1 } } });
      const next = await tx.tournamentFixture.findUniqueOrThrow({ where: { roundId_position: { roundId: nextRound.id, position: slot.position } }, include: { match: true } });
      const started = next.status === "IN_PROGRESS" || next.status === "COMPLETED" || next.status === "FORFEIT" || (next.match && next.match.status !== "SCHEDULED");
      if (started) throw new AdminError("The winner's next-round match has already started. Correct later rounds first, or resolve the dispute manually.", 409);
      const slotKey = slot.slot === 1 ? "player1Id" : "player2Id";
      if (next[slotKey] !== previousWinnerId) throw new AdminError("The bracket no longer matches this result; correction aborted.", 409);
      await tx.tournamentFixture.update({ where: { id: next.id }, data: { [slotKey]: winnerId, version: { increment: 1 } } });
      if (next.match) await tx.match.update({ where: { id: next.match.id }, data: { [slotKey]: winnerId, version: { increment: 1 } } });
    } else {
      await tx.tournament.update({ where: { id: fixture.tournamentId }, data: { winnerId, runnerUpId: loserId } });
    }
  }
  await tx.tournamentFixture.update({ where: { id: fixture.id }, data: { winnerId, loserId, version: { increment: 1 } } });
  if (fixture.tournament.format === "ROUND_ROBIN") await refreshRoundRobinResult(tx, fixture.tournamentId);
  return { fixtureId: fixture.id, winnerChanged: true };
}

async function refreshRoundRobinResult(tx: Prisma.TransactionClient, tournamentId: string) {
  const tournament = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId } });
  if (tournament.status !== "COMPLETED") return;
  const [participants, fixtures] = await Promise.all([
    tx.tournamentParticipant.findMany({ where: { tournamentId, status: { in: ["APPROVED", "WITHDRAWN", "REMOVED"] } }, include: { user: { select: { name: true } } } }),
    tx.tournamentFixture.findMany({ where: { tournamentId }, select: { player1Id: true, player2Id: true, winnerId: true, status: true, match: { select: { player1GamesWon: true, player2GamesWon: true, player1TotalPoints: true, player2TotalPoints: true } } } }),
  ]);
  const allowed = new Set<string>(DEFAULT_TIE_BREAK_ORDER);
  const order = tournament.tieBreakOrder.split(",").filter((rule): rule is TieBreakRule => allowed.has(rule));
  const standings = calculateRoundRobinStandings(participants.map((participant) => ({ playerId: participant.userId, name: participant.user.name, image: null })), fixtures, order.length ? order : [...DEFAULT_TIE_BREAK_ORDER]);
  await tx.tournament.update({ where: { id: tournamentId }, data: { winnerId: standings[0]?.playerId ?? null, runnerUpId: standings[1]?.playerId ?? null } });
}

export async function performMatchAction(adminId: string, matchId: string, input: MatchAction) {
  const prisma = db();
  return prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id: matchId }, include: { games: { orderBy: { number: "asc" }, include: { _count: { select: { points: true } } } }, tournamentFixture: { select: { id: true, status: true } } } });
    if (!match) throw new AdminError("Match not found.", 404);

    if (input.action === "review" || input.action === "clear_review") {
      const reviewStatus = input.action === "review" ? "UNDER_REVIEW" : "NONE";
      if (match.reviewStatus === reviewStatus) throw new AdminError(input.action === "review" ? "This match is already under review." : "This match is not under review.", 409);
      const updated = await tx.match.update({ where: { id: matchId }, data: { reviewStatus, reviewReason: input.action === "review" ? input.reason : null }, select: { reviewStatus: true, reviewReason: true } });
      await recordAudit(tx, { adminId, action: "MATCH_REVIEW_UPDATED", targetType: "Match", targetId: matchId, previousValue: { reviewStatus: match.reviewStatus, reviewReason: match.reviewReason }, newValue: updated, reason: input.reason });
      return updated;
    }

    if (input.action === "cancel") {
      if (match.status === "CANCELLED") throw new AdminError("This match is already cancelled.", 409);
      if (match.tournamentFixture && match.status === "COMPLETED") throw new AdminError("Completed tournament matches cannot be cancelled because the bracket has advanced. Correct the result instead.", 409);
      const now = new Date();
      const updated = await tx.match.update({ where: { id: matchId }, data: { status: "CANCELLED", cancelledAt: now, cancellationReason: input.reason, reviewStatus: "NONE", version: { increment: 1 } }, select: { status: true, cancelledAt: true } });
      if (match.tournamentFixture) await markTournamentMatchAbandoned(tx, matchId);
      await recordAudit(tx, { adminId, action: "MATCH_CANCELLED", targetType: "Match", targetId: matchId, previousValue: snapshot(match), newValue: updated, reason: input.reason });
      await notifyUsers(tx, [match.player1Id, match.player2Id], { type: "MATCH_CORRECTED", title: "A match was cancelled by an administrator", body: input.reason, link: `/matches/${matchId}`, dedupeKey: `match-cancel:${matchId}` });
      return updated;
    }

    if (match.status !== "COMPLETED") throw new AdminError("Only completed matches can have their result corrected.", 409);
    const result = validateCorrectedGames(input.games, match.bestOf);
    const winnerId = result.winner === 1 ? match.player1Id : match.player2Id;
    const loserId = result.winner === 1 ? match.player2Id : match.player1Id;
    const previous = snapshot(match);

    for (const [index, game] of input.games.entries()) {
      const number = index + 1;
      const gameWinnerId = getGameWinner(game.player1Score, game.player2Score) === 1 ? match.player1Id : match.player2Id;
      const existing = match.games.find((candidate) => candidate.number === number);
      if (existing) {
        await tx.matchGame.update({ where: { id: existing.id }, data: { player1Score: game.player1Score, player2Score: game.player2Score, winnerId: gameWinnerId, status: "COMPLETED", completedAt: existing.completedAt ?? new Date() } });
      } else {
        await tx.matchGame.create({ data: { matchId, number, firstServerId: number % 2 === 1 ? match.player1Id : match.player2Id, player1Score: game.player1Score, player2Score: game.player2Score, winnerId: gameWinnerId, status: "COMPLETED", completedAt: new Date() } });
      }
    }
    // Games beyond the corrected count are removed; their original scores remain in the correction snapshot.
    await tx.matchGame.deleteMany({ where: { matchId, number: { gt: input.games.length } } });
    const updated = await tx.match.update({
      where: { id: matchId },
      data: {
        winnerId, loserId,
        player1GamesWon: result.player1GamesWon,
        player2GamesWon: result.player2GamesWon,
        player1TotalPoints: input.games.reduce((sum, game) => sum + game.player1Score, 0),
        player2TotalPoints: input.games.reduce((sum, game) => sum + game.player2Score, 0),
        reviewStatus: "NONE",
        reviewReason: null,
        version: { increment: 1 },
      },
      include: { games: { orderBy: { number: "asc" } } },
    });
    const tournament = await syncTournamentAfterCorrection(tx, matchId, match.winnerId, winnerId, loserId);
    const next = snapshot(updated);
    await tx.matchCorrection.create({ data: { matchId, adminId, reason: input.reason, previousResult: previous, newResult: next } });
    await recordAudit(tx, { adminId, action: "MATCH_RESULT_CORRECTED", targetType: "Match", targetId: matchId, previousValue: previous, newValue: { ...next, tournament }, reason: input.reason });
    await notifyUsers(tx, [match.player1Id, match.player2Id], { type: "MATCH_CORRECTED", title: "A match result was corrected by an administrator", body: input.reason, link: `/matches/${matchId}` });
    return { ...next, tournament };
  });
}
