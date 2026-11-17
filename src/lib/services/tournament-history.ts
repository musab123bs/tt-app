import "server-only";

import { getPrismaClient } from "@/lib/prisma";

export type PlayerTournamentHistory = Awaited<ReturnType<typeof getPlayerTournamentHistory>>;

const displayName = (user: { name: string; playerProfile: { fullName: string; isPublic: boolean } | null } | null, viewerId?: string, userId?: string) =>
  !user ? "TBD" : user.playerProfile && !user.playerProfile.isPublic && viewerId !== userId ? "Private player" : user.playerProfile?.fullName?.trim() || user.name;

export async function getPlayerTournamentHistory(userId: string, viewerId?: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new Error("Database unavailable.");
  const playerSelect = { id: true, name: true, playerProfile: { select: { fullName: true, isPublic: true } } } as const;
  const [participations, fixtures] = await Promise.all([
    prisma.tournamentParticipant.findMany({
      where: { userId, status: { in: ["APPROVED", "WITHDRAWN", "REMOVED"] }, tournament: { status: { not: "DRAFT" } } },
      include: { tournament: { select: { id: true, name: true, status: true, format: true, startDate: true, winnerId: true, runnerUpId: true, drawGeneratedAt: true } } },
      orderBy: { tournament: { startDate: "desc" } },
      take: 100,
    }),
    prisma.tournamentFixture.findMany({
      where: { OR: [{ player1Id: userId }, { player2Id: userId }], status: { in: ["COMPLETED", "FORFEIT"] }, winnerId: { not: null } },
      include: {
        tournament: { select: { id: true, name: true } },
        round: { select: { label: true } },
        player1: { select: playerSelect },
        player2: { select: playerSelect },
        match: { select: { id: true, player1GamesWon: true, player2GamesWon: true, completedAt: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 200,
    }),
  ]);

  const record = new Map<string, { won: number; lost: number }>();
  let gamesWon = 0;
  let gamesLost = 0;
  for (const fixture of fixtures) {
    const row = record.get(fixture.tournamentId) ?? { won: 0, lost: 0 };
    if (fixture.winnerId === userId) row.won += 1; else row.lost += 1;
    record.set(fixture.tournamentId, row);
    if (fixture.match && fixture.status === "COMPLETED") {
      const isPlayer1 = fixture.player1Id === userId;
      gamesWon += isPlayer1 ? fixture.match.player1GamesWon : fixture.match.player2GamesWon;
      gamesLost += isPlayer1 ? fixture.match.player2GamesWon : fixture.match.player1GamesWon;
    }
  }
  const matchesWon = fixtures.filter((fixture) => fixture.winnerId === userId).length;
  const matchesLost = fixtures.length - matchesWon;

  return {
    summary: {
      tournamentsPlayed: participations.filter((entry) => entry.tournament.drawGeneratedAt).length,
      tournamentsEntered: participations.length,
      titles: participations.filter((entry) => entry.tournament.winnerId === userId).length,
      runnerUps: participations.filter((entry) => entry.tournament.runnerUpId === userId).length,
      matchesWon,
      matchesLost,
      winPercentage: fixtures.length ? Math.round((matchesWon / fixtures.length) * 100) : 0,
      gamesWon,
      gamesLost,
    },
    tournaments: participations.map((entry) => {
      const result = entry.tournament.winnerId === userId ? "Champion"
        : entry.tournament.runnerUpId === userId ? "Runner-up"
          : entry.status === "WITHDRAWN" ? "Withdrawn"
            : entry.status === "REMOVED" ? "Removed"
              : entry.tournament.status === "COMPLETED" ? "Participant"
                : entry.tournament.status === "CANCELLED" ? "Cancelled" : "In progress";
      return {
        id: entry.tournament.id,
        name: entry.tournament.name,
        status: entry.tournament.status,
        format: entry.tournament.format,
        startDate: entry.tournament.startDate.toISOString(),
        result,
        won: record.get(entry.tournament.id)?.won ?? 0,
        lost: record.get(entry.tournament.id)?.lost ?? 0,
      };
    }),
    recentMatches: fixtures.slice(0, 10).map((fixture) => {
      const isPlayer1 = fixture.player1Id === userId;
      const opponent = isPlayer1 ? fixture.player2 : fixture.player1;
      return {
        id: fixture.id,
        tournamentId: fixture.tournament.id,
        tournamentName: fixture.tournament.name,
        round: fixture.round.label,
        opponentName: displayName(opponent, viewerId, opponent?.id),
        won: fixture.winnerId === userId,
        score: fixture.match && fixture.status === "COMPLETED"
          ? `${isPlayer1 ? fixture.match.player1GamesWon : fixture.match.player2GamesWon}–${isPlayer1 ? fixture.match.player2GamesWon : fixture.match.player1GamesWon}`
          : "Walkover",
        matchId: fixture.match?.id ?? null,
      };
    }),
  };
}
