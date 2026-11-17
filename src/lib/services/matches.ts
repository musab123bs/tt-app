import "server-only";

import type { Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/prisma";
import type { MatchDetailView, MatchFilter, MatchPlayer, MatchSummary } from "@/lib/matches/types";

const playerInclude = {
  select: {
    id: true,
    name: true,
    image: true,
    playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } },
  },
} satisfies Prisma.UserDefaultArgs;

export const matchDetailInclude = {
  player1: playerInclude,
  player2: playerInclude,
  games: {
    orderBy: { number: "asc" },
    include: {
      points: {
        orderBy: { sequence: "asc" },
        include: {
          playerAwarded: {
            select: { id: true, name: true, playerProfile: { select: { fullName: true } } },
          },
          actor: { select: { id: true, name: true } },
        },
      },
    },
  },
} satisfies Prisma.MatchInclude;

type RawMatchDetail = Prisma.MatchGetPayload<{ include: typeof matchDetailInclude }>;

function serializePlayer(player: RawMatchDetail["player1"], viewerId?: string): MatchPlayer {
  return {
    id: player.id,
    name: player.playerProfile?.fullName?.trim() || player.name,
    image:
      player.id === viewerId || !player.playerProfile || player.playerProfile.isPublic
        ? player.playerProfile?.profileImage || player.image
        : null,
  };
}

function serializeSummary(match: RawMatchDetail, viewerId?: string): MatchSummary {
  return {
    id: match.id,
    createdById: match.createdById,
    player1: serializePlayer(match.player1, viewerId),
    player2: serializePlayer(match.player2, viewerId),
    bestOf: match.bestOf as 3 | 5 | 7,
    matchType: match.matchType,
    scheduledAt: match.scheduledAt.toISOString(),
    status: match.status,
    startedAt: match.startedAt?.toISOString() ?? null,
    completedAt: match.completedAt?.toISOString() ?? null,
    abandonedAt: match.abandonedAt?.toISOString() ?? null,
    winnerId: match.winnerId,
    loserId: match.loserId,
    player1GamesWon: match.player1GamesWon,
    player2GamesWon: match.player2GamesWon,
    player1TotalPoints: match.player1TotalPoints,
    player2TotalPoints: match.player2TotalPoints,
    durationSeconds: match.durationSeconds,
    location: match.location,
  };
}

export function serializeMatchDetail(match: RawMatchDetail, viewerId?: string): MatchDetailView {
  return {
    ...serializeSummary(match, viewerId),
    notes: match.notes,
    version: match.version,
    games: match.games.map((game) => ({
      id: game.id,
      number: game.number,
      firstServerId: game.firstServerId,
      player1Score: game.player1Score,
      player2Score: game.player2Score,
      status: game.status,
      winnerId: game.winnerId,
      completedAt: game.completedAt?.toISOString() ?? null,
      points: game.points.map((point) => ({
        id: point.id,
        sequence: point.sequence,
        action: point.action,
        playerAwardedId: point.playerAwardedId,
        playerAwardedName:
          point.playerAwarded?.playerProfile?.fullName?.trim() || point.playerAwarded?.name || null,
        serverId: point.serverId,
        actorId: point.actorId,
        actorName: point.actor.name,
        scorePlayer1: point.scorePlayer1,
        scorePlayer2: point.scorePlayer2,
        targetPointId: point.targetPointId,
        undoneAt: point.undoneAt?.toISOString() ?? null,
      })),
    })),
  };
}

export async function getAccessibleMatch(userId: string, matchId: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");

  const match = await prisma.match.findFirst({
    where: {
      id: matchId,
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    include: matchDetailInclude,
  });

  return match ? serializeMatchDetail(match, userId) : null;
}

export async function getPlayerMatchList(userId: string, filter: MatchFilter = "all") {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");

  const filterWhere: Prisma.MatchWhereInput =
    filter === "won"
      ? { status: "COMPLETED", winnerId: userId }
      : filter === "lost"
        ? { status: "COMPLETED", loserId: userId }
        : filter === "in_progress"
          ? { status: { in: ["SCHEDULED", "IN_PROGRESS"] } }
          : {};

  const matches = await prisma.match.findMany({
    where: {
      ...filterWhere,
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    include: {
      player1: playerInclude,
      player2: playerInclude,
    },
    orderBy: [{ scheduledAt: "desc" }, { createdAt: "desc" }],
    take: 100,
  });

  return matches.map((match) => ({
    id: match.id,
    createdById: match.createdById,
    player1: {
      id: match.player1.id,
      name: match.player1.playerProfile?.fullName?.trim() || match.player1.name,
      image:
        match.player1.id === userId || !match.player1.playerProfile || match.player1.playerProfile.isPublic
          ? match.player1.playerProfile?.profileImage || match.player1.image
          : null,
    },
    player2: {
      id: match.player2.id,
      name: match.player2.playerProfile?.fullName?.trim() || match.player2.name,
      image:
        match.player2.id === userId || !match.player2.playerProfile || match.player2.playerProfile.isPublic
          ? match.player2.playerProfile?.profileImage || match.player2.image
          : null,
    },
    bestOf: match.bestOf as 3 | 5 | 7,
    matchType: match.matchType,
    scheduledAt: match.scheduledAt.toISOString(),
    status: match.status,
    startedAt: match.startedAt?.toISOString() ?? null,
    completedAt: match.completedAt?.toISOString() ?? null,
    abandonedAt: match.abandonedAt?.toISOString() ?? null,
    winnerId: match.winnerId,
    loserId: match.loserId,
    player1GamesWon: match.player1GamesWon,
    player2GamesWon: match.player2GamesWon,
    player1TotalPoints: match.player1TotalPoints,
    player2TotalPoints: match.player2TotalPoints,
    durationSeconds: match.durationSeconds,
    location: match.location,
  } satisfies MatchSummary));
}

export type MatchTransactionClient = Prisma.TransactionClient;

export async function findAuthorizedMatch(
  transaction: MatchTransactionClient,
  userId: string,
  matchId: string,
) {
  return transaction.match.findFirst({
    where: {
      id: matchId,
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    include: matchDetailInclude,
  });
}
