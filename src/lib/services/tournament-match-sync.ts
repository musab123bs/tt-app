import "server-only";

import { Prisma, TournamentFixtureStatus, TournamentStatus } from "@/generated/prisma";
import { getNextEliminationSlot, calculateRoundRobinStandings } from "@/lib/tournaments/formats";
import type { TournamentError } from "@/lib/services/tournaments";
import { notifyUsers } from "@/lib/services/notifications";

type Tx = Prisma.TransactionClient;

export async function createTournamentFixtureMatch(
  tx: Tx,
  tournament: { id: string; createdById: string; name: string; bestOf: number; startDate: Date; location: string | null },
  fixture: { id: string; roundId: string; position: number; player1Id: string | null; player2Id: string | null; matchId: string | null; scheduledAt: Date | null; status: TournamentFixtureStatus },
) {
  if (!fixture.player1Id || !fixture.player2Id || fixture.matchId || fixture.status === "CANCELLED") return null;
  const scheduledAt = fixture.scheduledAt ?? tournament.startDate;
  const match = await tx.match.create({
    data: {
      requestId: `tournament:${tournament.id}:r${fixture.roundId}:f${fixture.position}`,
      createdById: tournament.createdById,
      player1Id: fixture.player1Id,
      player2Id: fixture.player2Id,
      matchType: "SINGLES",
      bestOf: tournament.bestOf,
      scheduledAt,
      location: tournament.location,
      notes: `Tournament match: ${tournament.name}`,
    },
  });
  await tx.tournamentFixture.update({
    where: { id: fixture.id },
    data: { matchId: match.id, scheduledAt, status: "SCHEDULED", version: { increment: 1 } },
  });
  await notifyUsers(tx, [fixture.player1Id, fixture.player2Id], {
    type: "TOURNAMENT_MATCH_SCHEDULED",
    title: `Your next match in ${tournament.name} is ready`,
    body: `Scheduled for ${scheduledAt.toUTCString()}.`,
    link: `/matches/${match.id}`,
    dedupeKey: `fixture-match:${fixture.id}:${match.id}`,
  });
  return match;
}

async function notifyTournamentCompleted(tx: Tx, tournamentId: string, winnerId: string | null) {
  const [tournament, participants, winner] = await Promise.all([
    tx.tournament.findUnique({ where: { id: tournamentId }, select: { name: true, createdById: true } }),
    tx.tournamentParticipant.findMany({ where: { tournamentId, status: { in: ["APPROVED", "WITHDRAWN", "REMOVED"] } }, select: { userId: true } }),
    winnerId ? tx.user.findUnique({ where: { id: winnerId }, select: { name: true, playerProfile: { select: { fullName: true } } } }) : null,
  ]);
  if (!tournament) return;
  const winnerName = winner?.playerProfile?.fullName?.trim() || winner?.name;
  await notifyUsers(tx, [tournament.createdById, ...participants.map((participant) => participant.userId)], {
    type: "TOURNAMENT_COMPLETED",
    title: `${tournament.name} is complete`,
    body: winnerName ? `Champion: ${winnerName}.` : "Final results are available.",
    link: `/tournaments/${tournamentId}`,
    dedupeKey: `completed:${tournamentId}`,
  });
}

async function updateRoundStatus(tx: Tx, roundId: string) {
  const pending = await tx.tournamentFixture.count({ where: { roundId, OR: [{ status: { in: ["PENDING", "SCHEDULED", "IN_PROGRESS"] } }, { status: "FORFEIT", winnerId: null }] } });
  const active = await tx.tournamentFixture.count({ where: { roundId, status: { in: ["SCHEDULED", "IN_PROGRESS"] } } });
  await tx.tournamentRound.update({ where: { id: roundId }, data: { status: pending ? active ? "IN_PROGRESS" : "PENDING" : "COMPLETED" } });
}

async function completeRoundRobinTournament(tx: Tx, tournamentId: string) {
  const remaining = await tx.tournamentFixture.count({ where: { tournamentId, status: { notIn: ["COMPLETED", "CANCELLED"] } } });
  if (remaining) return;
  const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || tournament.status === "CANCELLED" || tournament.status === "COMPLETED") return;
  const [participants, fixtures] = await Promise.all([
    tx.tournamentParticipant.findMany({
      where: { tournamentId, status: { in: ["APPROVED", "WITHDRAWN", "REMOVED"] } },
      include: { user: { select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } } } } },
    }),
    tx.tournamentFixture.findMany({ where: { tournamentId }, include: { match: { select: { player1GamesWon: true, player2GamesWon: true, player1TotalPoints: true, player2TotalPoints: true } } } }),
  ]);
  const standings = calculateRoundRobinStandings(
    participants.map((participant) => ({
      playerId: participant.userId,
      name: participant.user.playerProfile?.fullName?.trim() || participant.user.name,
      image: participant.user.playerProfile?.isPublic ? participant.user.playerProfile.profileImage || participant.user.image : null,
    })),
    fixtures.map((fixture) => ({
      player1Id: fixture.player1Id,
      player2Id: fixture.player2Id,
      winnerId: fixture.winnerId,
      status: fixture.status,
      match: fixture.match,
    })),
    tournament.tieBreakOrder.split(",").filter((rule): rule is "MATCH_WIN_PERCENTAGE" | "HEAD_TO_HEAD" | "GAME_DIFFERENCE" | "POINT_DIFFERENCE" => ["MATCH_WIN_PERCENTAGE", "HEAD_TO_HEAD", "GAME_DIFFERENCE", "POINT_DIFFERENCE"].includes(rule)),
  );
  await tx.tournament.update({
    where: { id: tournamentId },
    data: {
      status: TournamentStatus.COMPLETED,
      completedAt: new Date(),
      winnerId: standings[0]?.playerId ?? null,
      runnerUpId: standings[1]?.playerId ?? null,
    },
  });
  await notifyTournamentCompleted(tx, tournamentId, standings[0]?.playerId ?? null);
}

async function advanceEliminationWinner(tx: Tx, fixtureId: string, winnerId: string, loserId: string | null) {
  const fixture = await tx.tournamentFixture.findUnique({
    where: { id: fixtureId },
    include: { tournament: true, round: true },
  });
  if (!fixture || fixture.tournament.status === "CANCELLED") return;
  const totalRounds = await tx.tournamentRound.count({ where: { tournamentId: fixture.tournamentId } });
  if (fixture.round.number >= totalRounds) {
    await tx.tournament.update({
      where: { id: fixture.tournamentId },
      data: { status: "COMPLETED", completedAt: new Date(), winnerId, runnerUpId: loserId },
    });
    await notifyTournamentCompleted(tx, fixture.tournamentId, winnerId);
    return;
  }
  const nextLocation = getNextEliminationSlot(fixture.position);
  const nextRound = await tx.tournamentRound.findUnique({ where: { tournamentId_number: { tournamentId: fixture.tournamentId, number: fixture.round.number + 1 } } });
  if (!nextRound) throw new Error("Tournament bracket is missing its next round.");
  const next = await tx.tournamentFixture.findUnique({ where: { roundId_position: { roundId: nextRound.id, position: nextLocation.position } } });
  if (!next) throw new Error("Tournament bracket is missing its next fixture.");
  const currentSlot = nextLocation.slot === 1 ? next.player1Id : next.player2Id;
  const reservedForfeit = next.status === "FORFEIT" && !next.winnerId && next.loserId && (next.player1Id === next.loserId || next.player2Id === next.loserId);
  if (currentSlot && currentSlot !== winnerId && !(reservedForfeit && currentSlot === next.loserId)) throw new Error("Tournament bracket slot is already assigned to another player.");
  if (!currentSlot) {
    const changed = await tx.tournamentFixture.updateMany({
      where: { id: next.id, version: next.version, winnerId: null, status: { in: ["PENDING", "SCHEDULED", "FORFEIT"] } },
      data: { ...(nextLocation.slot === 1 ? { player1Id: winnerId } : { player2Id: winnerId }), version: { increment: 1 } },
    });
    if (changed.count !== 1) throw new Error("Tournament bracket advanced concurrently. Retry the match completion.");
  }
  const updatedNext = await tx.tournamentFixture.findUniqueOrThrow({ where: { id: next.id } });
  if (updatedNext.status === "FORFEIT" && !updatedNext.winnerId && updatedNext.loserId && updatedNext.player1Id && updatedNext.player2Id) {
    const automaticWinnerId = updatedNext.player1Id === updatedNext.loserId ? updatedNext.player2Id : updatedNext.player1Id;
    const locked = await tx.tournamentFixture.updateMany({
      where: { id: updatedNext.id, version: updatedNext.version, status: "FORFEIT", winnerId: null },
      data: { winnerId: automaticWinnerId, resultProcessedAt: new Date(), version: { increment: 1 } },
    });
    if (!locked.count) throw new Error("Tournament walkover was processed concurrently.");
    await updateRoundStatus(tx, updatedNext.roundId);
    await advanceEliminationWinner(tx, updatedNext.id, automaticWinnerId, updatedNext.loserId);
    return;
  }
  if (updatedNext.player1Id && updatedNext.player2Id && !updatedNext.matchId) {
    await createTournamentFixtureMatch(tx, fixture.tournament, updatedNext);
  }
}

export async function markTournamentMatchStarted(tx: Tx, matchId: string) {
  const fixture = await tx.tournamentFixture.findUnique({ where: { matchId }, include: { tournament: true } });
  if (!fixture) return;
  if (fixture.tournament.status === "CANCELLED" || fixture.status === "CANCELLED") throw new Error("This tournament fixture has been cancelled.");
  if (fixture.status === "COMPLETED" || fixture.status === "BYE" || fixture.status === "FORFEIT") throw new Error("This tournament fixture is already finalized.");
  await tx.tournamentFixture.update({ where: { id: fixture.id }, data: { status: "IN_PROGRESS", version: { increment: 1 } } });
  await tx.tournamentRound.update({ where: { id: fixture.roundId }, data: { status: "IN_PROGRESS" } });
}

export async function markTournamentMatchAbandoned(tx: Tx, matchId: string) {
  const fixture = await tx.tournamentFixture.findUnique({ where: { matchId } });
  if (!fixture || fixture.status === "COMPLETED" || fixture.status === "CANCELLED") return;
  await tx.tournamentFixture.update({ where: { id: fixture.id }, data: { status: "PENDING", resultProcessedAt: null, version: { increment: 1 } } });
  await updateRoundStatus(tx, fixture.roundId);
}

export async function completeTournamentMatch(tx: Tx, matchId: string, winnerId: string, loserId: string) {
  const fixture = await tx.tournamentFixture.findUnique({ where: { matchId }, include: { tournament: true, round: true } });
  if (!fixture || fixture.tournament.status === "CANCELLED") return;
  if (fixture.resultProcessedAt || fixture.status === "COMPLETED") return;
  if (fixture.status === "CANCELLED" || fixture.status === "BYE" || fixture.status === "FORFEIT") return;
  const locked = await tx.tournamentFixture.updateMany({
    where: { id: fixture.id, version: fixture.version, resultProcessedAt: null, status: { in: ["SCHEDULED", "IN_PROGRESS"] } },
    data: { status: "COMPLETED", winnerId, loserId, resultProcessedAt: new Date(), version: { increment: 1 } },
  });
  if (!locked.count) {
    const latest = await tx.tournamentFixture.findUnique({ where: { id: fixture.id } });
    if (latest?.resultProcessedAt || latest?.status === "COMPLETED") return;
    throw new Error("Tournament result processing conflicted. Retry match completion.");
  }
  await updateRoundStatus(tx, fixture.roundId);
  if (fixture.tournament.format === "SINGLE_ELIMINATION") await advanceEliminationWinner(tx, fixture.id, winnerId, loserId);
  else await completeRoundRobinTournament(tx, fixture.tournamentId);
}

export async function forfeitTournamentParticipant(tx: Tx, tournamentId: string, playerId: string, reason: string) {
  const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament || !tournament.drawGeneratedAt || tournament.status === "CANCELLED" || tournament.status === "COMPLETED") return;
  const active = await tx.tournamentFixture.findFirst({ where: { tournamentId, status: "IN_PROGRESS", OR: [{ player1Id: playerId }, { player2Id: playerId }] } });
  if (active) throw new Error("A player cannot be removed while their tournament match is in progress.");
  const pendingFixtures = await tx.tournamentFixture.findMany({
    where: { tournamentId, status: { in: ["PENDING", "SCHEDULED"] }, OR: [{ player1Id: playerId }, { player2Id: playerId }] },
    include: { match: true, round: true },
    orderBy: { round: { number: "asc" } },
  });
  if (tournament.format === "ROUND_ROBIN") {
    const now = new Date();
    const matchIds = pendingFixtures.flatMap((fixture) => fixture.matchId ? [fixture.matchId] : []);
    if (matchIds.length) await tx.match.updateMany({ where: { id: { in: matchIds }, status: "SCHEDULED" }, data: { status: "ABANDONED", abandonedAt: now, version: { increment: 1 } } });
    await tx.tournamentFixture.updateMany({ where: { id: { in: pendingFixtures.map((fixture) => fixture.id) } }, data: { status: "CANCELLED", version: { increment: 1 } } });
    for (const fixture of pendingFixtures) await updateRoundStatus(tx, fixture.roundId);
    await completeRoundRobinTournament(tx, tournamentId);
    return;
  }
  for (const fixture of pendingFixtures) {
    const opponentId = fixture.player1Id === playerId ? fixture.player2Id : fixture.player1Id;
    if (!opponentId) {
      await tx.tournamentFixture.update({
        where: { id: fixture.id },
        data: { status: "FORFEIT", winnerId: null, loserId: playerId, resultProcessedAt: null, version: { increment: 1 } },
      });
      await updateRoundStatus(tx, fixture.roundId);
      continue;
    }
    if (fixture.match?.status === "SCHEDULED") await tx.match.update({ where: { id: fixture.match.id }, data: { status: "ABANDONED", abandonedAt: new Date(), version: { increment: 1 } } });
    await tx.tournamentFixture.update({
      where: { id: fixture.id },
      data: { status: "FORFEIT", winnerId: opponentId, loserId: playerId, resultProcessedAt: new Date(), version: { increment: 1 } },
    });
    await updateRoundStatus(tx, fixture.roundId);
    await advanceEliminationWinner(tx, fixture.id, opponentId, playerId);
  }
  void reason;
}

export type TournamentSyncTransaction = Tx;
export type TournamentCompletionError = TournamentError;
