import "server-only";

import type { Prisma } from "@/generated/prisma";
import {
  calculateHeadToHead,
  calculatePlayerTotals,
  filterMatchesByTimeframe,
  getLeaderboardPeriodStart,
  getPerformanceBuckets,
  rankLeaderboard,
  type AnalyticsTimeframe,
  type CompletedMatchRecord,
  type LeaderboardPeriod,
} from "@/lib/analytics/calculations";
import { getPrismaClient } from "@/lib/prisma";

const completedMatchSelect = {
  id: true,
  player1Id: true,
  player2Id: true,
  winnerId: true,
  completedAt: true,
  player1GamesWon: true,
  player2GamesWon: true,
  player1TotalPoints: true,
  player2TotalPoints: true,
} satisfies Prisma.MatchSelect;

function completedRecord(match: Prisma.MatchGetPayload<{ select: typeof completedMatchSelect }>): CompletedMatchRecord | null {
  if (!match.completedAt || !match.winnerId) return null;
  return { ...match, completedAt: match.completedAt };
}

function formatScore(player1Games: number, player2Games: number, perspectiveIsPlayer1: boolean) {
  return perspectiveIsPlayer1
    ? `${player1Games}–${player2Games}`
    : `${player2Games}–${player1Games}`;
}

export async function getPlayerAnalytics(
  playerId: string,
  viewerId: string | null,
  timeframe: AnalyticsTimeframe,
  now = new Date(),
) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");

  const user = await prisma.user.findUnique({
    where: { id: playerId },
    select: {
      id: true,
      role: true,
      name: true,
      image: true,
      playerProfile: {
        select: {
          fullName: true, profileImage: true, isPublic: true, level: true,
          country: true, city: true, clubName: true, bio: true,
        },
      },
    },
  });
  if (!user || user.role !== "PLAYER" || (viewerId !== playerId && user.playerProfile && !user.playerProfile.isPublic)) return null;

  const rawMatches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      completedAt: { not: null },
      winnerId: { not: null },
      OR: [{ player1Id: playerId }, { player2Id: playerId }],
    },
    select: {
      ...completedMatchSelect,
      bestOf: true,
      player1: {
        select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } } },
      },
      player2: {
        select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } } },
      },
    },
    orderBy: [{ completedAt: "asc" }, { id: "asc" }],
  });
  const matches = rawMatches.flatMap((match) => {
    const record = completedRecord(match);
    return record ? [{ ...record, bestOf: match.bestOf, player1: match.player1, player2: match.player2 }] : [];
  });
  const records = matches as Array<CompletedMatchRecord & {
    bestOf: number;
    player1: typeof rawMatches[number]["player1"];
    player2: typeof rawMatches[number]["player2"];
  }>;
  const allTimeTotals = calculatePlayerTotals(records, playerId);
  const timeframeMatches = filterMatchesByTimeframe(records, timeframe, now);
  const timeframeTotals = calculatePlayerTotals(timeframeMatches, playerId);
  const recentMatches = [...records].reverse().slice(0, 10).map((match) => {
    const player1 = match.player1Id === playerId;
    const opponent = player1 ? match.player2 : match.player1;
    const showOpponent = viewerId === playerId || !opponent.playerProfile || opponent.playerProfile.isPublic;
    return {
      id: match.id,
      opponentName: showOpponent ? opponent.playerProfile?.fullName?.trim() || opponent.name : "Private player",
      opponentImage: showOpponent ? opponent.playerProfile?.profileImage || opponent.image : null,
      completedAt: match.completedAt.toISOString(),
      result: match.winnerId === playerId ? "Win" as const : "Loss" as const,
      score: formatScore(match.player1GamesWon, match.player2GamesWon, player1),
      format: `Best of ${match.bestOf}`,
    };
  });

  return {
    player: {
      id: user.id,
      name: user.playerProfile?.fullName?.trim() || user.name,
      image: user.playerProfile?.profileImage || user.image,
      level: user.playerProfile?.level ?? null,
      country: user.playerProfile?.country ?? null,
      city: user.playerProfile?.city ?? null,
      clubName: user.playerProfile?.clubName ?? null,
      bio: user.playerProfile?.bio ?? null,
    },
    totals: allTimeTotals,
    timeframeTotals,
    timeframe,
    buckets: getPerformanceBuckets(records, playerId, timeframe, now),
    recentMatches,
  };
}

export async function getHeadToHeadAnalytics(playerAId: string, playerBId: string, viewerId: string) {
  if (!playerAId || !playerBId || playerAId === playerBId) return null;
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const [players, rawMatches] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: [playerAId, playerBId] }, role: "PLAYER" },
      select: {
        id: true, name: true, image: true,
        playerProfile: { select: { fullName: true, profileImage: true, isPublic: true, level: true } },
      },
    }),
    prisma.match.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { not: null },
        winnerId: { not: null },
        OR: [
          { player1Id: playerAId, player2Id: playerBId },
          { player1Id: playerBId, player2Id: playerAId },
        ],
      },
      select: completedMatchSelect,
      orderBy: [{ completedAt: "desc" }, { id: "desc" }],
    }),
  ]);
  if (players.length !== 2) return null;
  if (players.some((player) => player.id !== viewerId && player.playerProfile && !player.playerProfile.isPublic)) return null;
  const records = rawMatches.flatMap((match) => {
    const record = completedRecord(match);
    return record ? [record] : [];
  });
  const totals = calculateHeadToHead(records, playerAId, playerBId);
  const byId = new Map(players.map((player) => [player.id, player]));
  const serializePlayer = (id: string) => {
    const player = byId.get(id)!;
    return {
      id,
      name: player.playerProfile?.fullName?.trim() || player.name,
      image: player.playerProfile?.profileImage || player.image,
      level: player.playerProfile?.level ?? null,
    };
  };
  return {
    playerA: serializePlayer(playerAId),
    playerB: serializePlayer(playerBId),
    ...totals,
    recentResults: totals.recentResults.map((result) => ({
      ...result,
      completedAt: result.completedAt.toISOString(),
      score: formatScore(result.player1GamesWon, result.player2GamesWon, result.player1Id === playerAId),
    })),
    mostRecentAt: totals.mostRecentAt?.toISOString() ?? null,
  };
}

function getMinimumMatchRequirement() {
  const value = Number(process.env.LEADERBOARD_MIN_MATCHES ?? 5);
  return Number.isInteger(value) && value >= 1 ? value : 5;
}

export async function getPlayerLeaderboard(period: LeaderboardPeriod, now = new Date()) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const start = getLeaderboardPeriodStart(period, now);
  const [players, rawMatches] = await Promise.all([
    prisma.user.findMany({
      where: { role: "PLAYER", playerProfile: { is: { isPublic: true } } },
      select: {
        id: true, name: true, image: true,
        playerProfile: { select: { fullName: true, profileImage: true, level: true } },
      },
    }),
    prisma.match.findMany({
      where: {
        status: "COMPLETED",
        completedAt: { not: null, ...(start ? { gte: start } : {}) },
        winnerId: { not: null },
      },
      select: completedMatchSelect,
      orderBy: [{ completedAt: "asc" }, { id: "asc" }],
    }),
  ]);
  const records = rawMatches.flatMap((match) => {
    const record = completedRecord(match);
    return record ? [record] : [];
  });
  const minimumMatches = getMinimumMatchRequirement();
  const totals = players.map((player) => ({
    id: player.id,
    name: player.playerProfile?.fullName?.trim() || player.name,
    image: player.playerProfile?.profileImage || player.image,
    level: player.playerProfile?.level ?? null,
    ...calculatePlayerTotals(records, player.id),
  }));
  const ranked = rankLeaderboard(totals, records, minimumMatches);
  return {
    period,
    minimumMatches,
    players: ranked.map((player, index) => ({ ...player, rank: index + 1, eligible: player.played >= minimumMatches })),
    updatedAt: now.toISOString(),
  };
}

