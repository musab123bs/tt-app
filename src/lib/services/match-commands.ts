import "server-only";

import { MatchCommandAction, MatchPointAction, Prisma } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/prisma";
import {
  findAuthorizedMatch,
  matchDetailInclude,
  serializeMatchDetail,
} from "@/lib/services/matches";
import {
  getFirstServerForNextGame,
  getGameWinner,
  getMatchWinner,
  getServerId,
} from "@/lib/matches/scoring";
import type { MatchDetailView } from "@/lib/matches/types";
import { completeTournamentMatch, markTournamentMatchAbandoned, markTournamentMatchStarted } from "@/lib/services/tournament-match-sync";
import { TournamentError } from "@/lib/services/tournaments";

export class MatchCommandError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "MatchCommandError";
  }
}

async function syncTournamentResult(operation: () => Promise<void>) {
  try {
    await operation();
  } catch (error) {
    if (error instanceof TournamentError) throw new MatchCommandError(error.message, error.status);
    throw new MatchCommandError(error instanceof Error ? error.message : "Tournament match update failed.", 409);
  }
}

type CommandAction = "start" | "point" | "undo" | "confirm_game" | "finish" | "abandon";

const actionMap: Record<CommandAction, MatchCommandAction> = {
  start: MatchCommandAction.START,
  point: MatchCommandAction.POINT,
  undo: MatchCommandAction.UNDO,
  confirm_game: MatchCommandAction.CONFIRM_GAME,
  finish: MatchCommandAction.FINISH,
  abandon: MatchCommandAction.ABANDON,
};

async function getCurrentDetail(
  transaction: Prisma.TransactionClient,
  userId: string,
  matchId: string,
): Promise<MatchDetailView> {
  const match = await findAuthorizedMatch(transaction, userId, matchId);
  if (!match) throw new MatchCommandError("Match not found.", 404);
  return serializeMatchDetail(match, userId);
}

async function lockMatch(
  transaction: Prisma.TransactionClient,
  matchId: string,
  version: number,
  status: "SCHEDULED" | "IN_PROGRESS",
) {
  const result = await transaction.match.updateMany({
    where: { id: matchId, version, status },
    data: { version: { increment: 1 } },
  });
  if (result.count !== 1) {
    throw new MatchCommandError("This match changed in another request. Refresh and try again.", 409);
  }
}

async function createCommand(
  transaction: Prisma.TransactionClient,
  matchId: string,
  requestId: string,
  action: CommandAction,
  actorId: string,
) {
  return transaction.matchCommand.create({
    data: { matchId, requestId, action: actionMap[action], actorId },
  });
}

async function nextPointSequence(transaction: Prisma.TransactionClient, gameId: string) {
  const aggregate = await transaction.matchPoint.aggregate({
    where: { gameId },
    _max: { sequence: true },
  });
  return (aggregate._max.sequence ?? 0) + 1;
}

export async function performMatchCommand(input: {
  userId: string;
  matchId: string;
  requestId: string;
  action: CommandAction;
  playerId?: string;
}) {
  const prisma = getPrismaClient();
  if (!prisma) throw new MatchCommandError("Database unavailable.", 503);

  return prisma.$transaction(async (transaction) => {
    const match = await findAuthorizedMatch(transaction, input.userId, input.matchId);
    if (!match) throw new MatchCommandError("Match not found.", 404);

    const previousCommand = await transaction.matchCommand.findUnique({
      where: { matchId_requestId: { matchId: match.id, requestId: input.requestId } },
    });
    if (previousCommand) return serializeMatchDetail(match, input.userId);

    if (input.action === "start") {
      if (match.status === "IN_PROGRESS") return serializeMatchDetail(match, input.userId);
      if (match.status !== "SCHEDULED") {
        throw new MatchCommandError("Only a scheduled match can be started.", 409);
      }

      await lockMatch(transaction, match.id, match.version, "SCHEDULED");
      await createCommand(transaction, match.id, input.requestId, "start", input.userId);
      await transaction.match.update({
        where: { id: match.id },
        data: { status: "IN_PROGRESS", startedAt: new Date() },
      });
      await markTournamentMatchStarted(transaction, match.id);
      await transaction.matchGame.create({
        data: { matchId: match.id, number: 1, firstServerId: match.player1Id },
      });
      await syncTournamentResult(() => markTournamentMatchStarted(transaction, match.id));

      return getCurrentDetail(transaction, input.userId, match.id);
    }

    if (input.action === "abandon") {
      if (match.status !== "SCHEDULED" && match.status !== "IN_PROGRESS") {
        throw new MatchCommandError("This match can no longer be abandoned.", 409);
      }

      await lockMatch(transaction, match.id, match.version, match.status);
      await createCommand(transaction, match.id, input.requestId, "abandon", input.userId);
      await transaction.match.update({
        where: { id: match.id },
        data: { status: "ABANDONED", abandonedAt: new Date() },
      });
      await markTournamentMatchAbandoned(transaction, match.id);
      await syncTournamentResult(() => markTournamentMatchAbandoned(transaction, match.id));

      return getCurrentDetail(transaction, input.userId, match.id);
    }

    if (match.status !== "IN_PROGRESS") {
      throw new MatchCommandError("Scoring is available only while the match is in progress.", 409);
    }

    await lockMatch(transaction, match.id, match.version, "IN_PROGRESS");
    await createCommand(
      transaction,
      match.id,
      input.requestId,
      input.action,
      input.userId,
    );
    const game = [...match.games].reverse().find((candidate) => candidate.status === "IN_PROGRESS");

    if (input.action === "point") {
      if (!game) throw new MatchCommandError("There is no active game to score.", 409);
      if (getGameWinner(game.player1Score, game.player2Score)) {
        throw new MatchCommandError("Confirm this game before adding more points.", 409);
      }
      if (input.playerId !== match.player1Id && input.playerId !== match.player2Id) {
        throw new MatchCommandError("Choose one of the players to award the point.", 400);
      }

      const player1Scored = input.playerId === match.player1Id;
      const player1Score = game.player1Score + (player1Scored ? 1 : 0);
      const player2Score = game.player2Score + (player1Scored ? 0 : 1);
      const serverId = getServerId(
        game.firstServerId,
        match.player1Id,
        match.player2Id,
        game.player1Score + game.player2Score,
      );

      await transaction.matchPoint.create({
        data: {
          matchId: match.id,
          gameId: game.id,
          sequence: await nextPointSequence(transaction, game.id),
          action: MatchPointAction.POINT,
          playerAwardedId: input.playerId,
          serverId,
          actorId: input.userId,
          scorePlayer1: player1Score,
          scorePlayer2: player2Score,
          requestId: input.requestId,
        },
      });
      await transaction.matchGame.update({
        where: { id: game.id },
        data: { player1Score, player2Score },
      });
      await transaction.match.update({
        where: { id: match.id },
        data: {
          player1TotalPoints: { increment: player1Scored ? 1 : 0 },
          player2TotalPoints: { increment: player1Scored ? 0 : 1 },
        },
      });
    } else if (input.action === "undo") {
      if (!game) throw new MatchCommandError("There is no active game to undo.", 409);

      const lastPoint = await transaction.matchPoint.findFirst({
        where: { gameId: game.id, action: MatchPointAction.POINT, undoneAt: null },
        orderBy: { sequence: "desc" },
      });
      if (!lastPoint || !lastPoint.playerAwardedId) {
        throw new MatchCommandError("There is no point to undo in this game.", 409);
      }

      const player1Scored = lastPoint.playerAwardedId === match.player1Id;
      const player1Score = game.player1Score - (player1Scored ? 1 : 0);
      const player2Score = game.player2Score - (player1Scored ? 0 : 1);
      const now = new Date();

      await transaction.matchPoint.update({
        where: { id: lastPoint.id },
        data: { undoneAt: now, undoneById: input.userId },
      });
      await transaction.matchPoint.create({
        data: {
          matchId: match.id,
          gameId: game.id,
          sequence: await nextPointSequence(transaction, game.id),
          action: MatchPointAction.UNDO,
          actorId: input.userId,
          scorePlayer1: player1Score,
          scorePlayer2: player2Score,
          requestId: input.requestId,
          targetPointId: lastPoint.id,
        },
      });
      await transaction.matchGame.update({
        where: { id: game.id },
        data: { player1Score, player2Score },
      });
      await transaction.match.update({
        where: { id: match.id },
        data: {
          player1TotalPoints: { decrement: player1Scored ? 1 : 0 },
          player2TotalPoints: { decrement: player1Scored ? 0 : 1 },
        },
      });
    } else if (input.action === "confirm_game") {
      if (!game) throw new MatchCommandError("There is no active game to confirm.", 409);
      const winnerNumber = getGameWinner(game.player1Score, game.player2Score);
      if (!winnerNumber) {
        throw new MatchCommandError("A game is complete only after reaching 11 points with a two point lead.", 409);
      }

      const winnerId = winnerNumber === 1 ? match.player1Id : match.player2Id;
      const player1GamesWon = match.player1GamesWon + (winnerNumber === 1 ? 1 : 0);
      const player2GamesWon = match.player2GamesWon + (winnerNumber === 2 ? 1 : 0);

      await transaction.matchGame.update({
        where: { id: game.id },
        data: { status: "COMPLETED", winnerId, completedAt: new Date() },
      });
      await transaction.match.update({
        where: { id: match.id },
        data: { player1GamesWon, player2GamesWon },
      });

      if (!getMatchWinner(player1GamesWon, player2GamesWon, match.bestOf)) {
        await transaction.matchGame.create({
          data: {
            matchId: match.id,
            number: game.number + 1,
            firstServerId: getFirstServerForNextGame(
              game.firstServerId,
              match.player1Id,
              match.player2Id,
            ),
          },
        });
      }
    } else if (input.action === "finish") {
      const winnerNumber = getMatchWinner(
        match.player1GamesWon,
        match.player2GamesWon,
        match.bestOf,
      );
      const lastGame = [...match.games].sort((a, b) => b.number - a.number)[0];

      if (!winnerNumber || !lastGame || lastGame.status !== "COMPLETED") {
        throw new MatchCommandError("Finish the required number of games before ending this match.", 409);
      }

      const winnerId = winnerNumber === 1 ? match.player1Id : match.player2Id;
      const loserId = winnerNumber === 1 ? match.player2Id : match.player1Id;
      const completedAt = new Date();
      const durationSeconds = match.startedAt
        ? Math.max(0, Math.floor((completedAt.getTime() - match.startedAt.getTime()) / 1000))
        : null;

      await transaction.match.update({
        where: { id: match.id },
        data: {
          status: "COMPLETED",
          winnerId,
          loserId,
          completedAt,
          durationSeconds,
        },
      });
      await syncTournamentResult(() => completeTournamentMatch(transaction, match.id, winnerId, loserId));
    }

    return getCurrentDetail(transaction, input.userId, match.id);
  });
}

export async function recoverDuplicateCommand(
  userId: string,
  matchId: string,
  requestId: string,
): Promise<MatchDetailView | null> {
  const prisma = getPrismaClient();
  if (!prisma) return null;

  const command = await prisma.matchCommand.findUnique({
    where: { matchId_requestId: { matchId, requestId } },
    select: { id: true },
  });
  if (!command) return null;

  const match = await prisma.match.findFirst({
    where: { id: matchId, OR: [{ player1Id: userId }, { player2Id: userId }] },
    include: matchDetailInclude,
  });
      return match ? serializeMatchDetail(match, userId) : null;
}
