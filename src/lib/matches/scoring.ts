export type PlayerSide = "left" | "right";

export type ScoringPoint = {
  action: "POINT" | "UNDO";
  scorePlayer1: number;
  scorePlayer2: number;
  undoneAt?: string | Date | null;
  sequence: number;
};

export function getGameWinner(player1Score: number, player2Score: number): 1 | 2 | null {
  if (Math.max(player1Score, player2Score) < 11 || Math.abs(player1Score - player2Score) < 2) {
    return null;
  }

  return player1Score > player2Score ? 1 : 2;
}

export function getGamesToWin(bestOf: number) {
  return Math.floor(bestOf / 2) + 1;
}

export function getMatchWinner(
  player1GamesWon: number,
  player2GamesWon: number,
  bestOf: number,
): 1 | 2 | null {
  const gamesToWin = getGamesToWin(bestOf);
  if (player1GamesWon >= gamesToWin) return 1;
  if (player2GamesWon >= gamesToWin) return 2;
  return null;
}

export function getFirstServerForNextGame(
  previousFirstServerId: string,
  player1Id: string,
  player2Id: string,
) {
  return previousFirstServerId === player1Id ? player2Id : player1Id;
}

export function getServerId(
  firstServerId: string,
  player1Id: string,
  player2Id: string,
  pointsPlayed: number,
) {
  const serviceChanges =
    pointsPlayed < 20 ? Math.floor(pointsPlayed / 2) : 10 + (pointsPlayed - 20);
  if (serviceChanges % 2 === 0) return firstServerId;
  return firstServerId === player1Id ? player2Id : player1Id;
}

export function isDecidingGame(gameNumber: number, bestOf: number) {
  return gameNumber === bestOf;
}

export function decidingGameEndsHaveChanged(
  bestOf: number,
  gameNumber: number,
  points: ScoringPoint[],
) {
  if (!isDecidingGame(gameNumber, bestOf)) return false;

  return points.some(
    (point) =>
      point.action === "POINT" &&
      !point.undoneAt &&
      (point.scorePlayer1 >= 5 || point.scorePlayer2 >= 5),
  );
}

export function getPlayerSides(
  gameNumber: number,
  bestOf: number,
  points: ScoringPoint[],
) {
  const player1StartsOnLeft = gameNumber % 2 === 1;
  const player1IsOnLeft =
    decidingGameEndsHaveChanged(bestOf, gameNumber, points)
      ? !player1StartsOnLeft
      : player1StartsOnLeft;

  return {
    player1: player1IsOnLeft ? ("left" as PlayerSide) : ("right" as PlayerSide),
    player2: player1IsOnLeft ? ("right" as PlayerSide) : ("left" as PlayerSide),
  };
}
