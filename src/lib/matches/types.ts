export type MatchStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "ABANDONED";

export type MatchPlayer = {
  id: string;
  name: string;
  image: string | null;
};

export type MatchSummary = {
  id: string;
  createdById: string;
  player1: MatchPlayer;
  player2: MatchPlayer;
  bestOf: 3 | 5 | 7;
  matchType: "SINGLES";
  scheduledAt: string;
  status: MatchStatus;
  startedAt: string | null;
  completedAt: string | null;
  abandonedAt: string | null;
  winnerId: string | null;
  loserId: string | null;
  player1GamesWon: number;
  player2GamesWon: number;
  player1TotalPoints: number;
  player2TotalPoints: number;
  durationSeconds: number | null;
  location: string | null;
};

export type MatchPointView = {
  id: string;
  sequence: number;
  action: "POINT" | "UNDO";
  playerAwardedId: string | null;
  playerAwardedName: string | null;
  serverId: string | null;
  actorId: string;
  actorName: string;
  scorePlayer1: number;
  scorePlayer2: number;
  targetPointId: string | null;
  undoneAt: string | null;
};

export type MatchGameView = {
  id: string;
  number: number;
  firstServerId: string;
  player1Score: number;
  player2Score: number;
  status: "IN_PROGRESS" | "COMPLETED";
  winnerId: string | null;
  completedAt: string | null;
  points: MatchPointView[];
};

export type MatchDetailView = MatchSummary & {
  notes: string | null;
  version: number;
  games: MatchGameView[];
};

export type MatchFilter = "all" | "won" | "lost" | "in_progress";
