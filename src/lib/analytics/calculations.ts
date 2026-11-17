export const ANALYTICS_TIMEFRAMES = ["7d", "30d", "3m", "6m", "12m", "all"] as const;
export type AnalyticsTimeframe = (typeof ANALYTICS_TIMEFRAMES)[number];
export type LeaderboardPeriod = "overall" | "weekly" | "monthly" | "yearly";

export type CompletedMatchRecord = {
  id: string;
  player1Id: string;
  player2Id: string;
  winnerId: string | null;
  completedAt: Date;
  player1GamesWon: number;
  player2GamesWon: number;
  player1TotalPoints: number;
  player2TotalPoints: number;
};

export type PlayerMatchTotals = {
  played: number;
  won: number;
  lost: number;
  winPercentage: number;
  lossPercentage: number;
  gamesWon: number;
  gamesLost: number;
  pointsScored: number;
  pointsConceded: number;
  currentWinningStreak: number;
  currentLosingStreak: number;
  longestWinningStreak: number;
  longestLosingStreak: number;
  recent5: Array<"W" | "L">;
  recent10: Array<"W" | "L">;
  recent5WinPercentage: number;
  recent10WinPercentage: number;
};

export type PerformanceBucket = {
  period: string;
  wins: number;
  losses: number;
  gamesWon: number;
  gamesLost: number;
  pointsScored: number;
  pointsConceded: number;
  matches: number;
  winRate: number;
};

export function getTimeframeStart(timeframe: AnalyticsTimeframe, now = new Date()): Date | null {
  if (timeframe === "all") return null;
  const start = new Date(now);
  if (timeframe.endsWith("d")) {
    start.setUTCDate(start.getUTCDate() - Number(timeframe.slice(0, -1)));
  } else {
    const day = start.getUTCDate();
    start.setUTCDate(1);
    start.setUTCMonth(start.getUTCMonth() - Number(timeframe.slice(0, -1)));
    const lastDayOfTargetMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, lastDayOfTargetMonth));
  }
  return start;
}

export function filterMatchesByTimeframe<T extends { completedAt: Date }>(
  matches: T[],
  timeframe: AnalyticsTimeframe,
  now = new Date(),
): T[] {
  const start = getTimeframeStart(timeframe, now);
  return matches.filter((match) => match.completedAt <= now && (!start || match.completedAt >= start));
}

function getPlayerPerspective(match: CompletedMatchRecord, playerId: string) {
  const isPlayer1 = match.player1Id === playerId;
  return {
    won: match.winnerId === playerId,
    gamesWon: isPlayer1 ? match.player1GamesWon : match.player2GamesWon,
    gamesLost: isPlayer1 ? match.player2GamesWon : match.player1GamesWon,
    pointsScored: isPlayer1 ? match.player1TotalPoints : match.player2TotalPoints,
    pointsConceded: isPlayer1 ? match.player2TotalPoints : match.player1TotalPoints,
  };
}

function percentage(numerator: number, denominator: number) {
  return denominator ? Math.round((numerator / denominator) * 1000) / 10 : 0;
}

export function calculatePlayerTotals(
  input: CompletedMatchRecord[],
  playerId: string,
): PlayerMatchTotals {
  const matches = input
    .filter((match) => match.player1Id === playerId || match.player2Id === playerId)
    .filter((match) => match.winnerId === playerId || match.winnerId === (match.player1Id === playerId ? match.player2Id : match.player1Id))
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime() || a.id.localeCompare(b.id));
  const outcomes = matches.map((match) => getPlayerPerspective(match, playerId));
  const won = outcomes.filter((outcome) => outcome.won).length;
  let currentWinningStreak = 0;
  let currentLosingStreak = 0;
  let longestWinningStreak = 0;
  let longestLosingStreak = 0;
  let activeWins = 0;
  let activeLosses = 0;

  for (const outcome of outcomes) {
    activeWins = outcome.won ? activeWins + 1 : 0;
    activeLosses = outcome.won ? 0 : activeLosses + 1;
    longestWinningStreak = Math.max(longestWinningStreak, activeWins);
    longestLosingStreak = Math.max(longestLosingStreak, activeLosses);
  }
  if (outcomes.at(-1)?.won) currentWinningStreak = activeWins;
  else if (outcomes.length) currentLosingStreak = activeLosses;

  const recent5 = outcomes.slice(-5).map((outcome) => outcome.won ? "W" as const : "L" as const);
  const recent10 = outcomes.slice(-10).map((outcome) => outcome.won ? "W" as const : "L" as const);
  const games = outcomes.reduce((sum, outcome) => ({
    won: sum.won + outcome.gamesWon,
    lost: sum.lost + outcome.gamesLost,
  }), { won: 0, lost: 0 });
  const points = outcomes.reduce((sum, outcome) => ({
    scored: sum.scored + outcome.pointsScored,
    conceded: sum.conceded + outcome.pointsConceded,
  }), { scored: 0, conceded: 0 });

  return {
    played: outcomes.length,
    won,
    lost: outcomes.length - won,
    winPercentage: percentage(won, outcomes.length),
    lossPercentage: percentage(outcomes.length - won, outcomes.length),
    gamesWon: games.won,
    gamesLost: games.lost,
    pointsScored: points.scored,
    pointsConceded: points.conceded,
    currentWinningStreak,
    currentLosingStreak,
    longestWinningStreak,
    longestLosingStreak,
    recent5,
    recent10,
    recent5WinPercentage: percentage(recent5.filter((result) => result === "W").length, recent5.length),
    recent10WinPercentage: percentage(recent10.filter((result) => result === "W").length, recent10.length),
  };
}

function localDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localMidnightAsUtc(year: number, month: number, day: number, timeZone: string) {
  const targetUtc = Date.UTC(year, month - 1, day);
  let candidate = targetUtc;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone,
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date(candidate));
    const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
    const representedUtc = Date.UTC(values.year, values.month - 1, values.day, values.hour, values.minute, values.second);
    candidate += targetUtc - representedUtc;
  }
  return new Date(candidate);
}

export function getLeaderboardPeriodStart(period: LeaderboardPeriod, now = new Date(), timeZone = "Asia/Karachi"): Date | null {
  if (period === "overall") return null;
  const parts = localDateParts(now, timeZone);
  const year = Number(parts.year);
  const month = Number(parts.month);
  const day = Number(parts.day);
  const localDay = new Date(Date.UTC(year, month - 1, day));
  if (period === "weekly") localDay.setUTCDate(localDay.getUTCDate() - ((localDay.getUTCDay() + 6) % 7));
  if (period === "monthly") localDay.setUTCDate(1);
  if (period === "yearly") {
    localDay.setUTCMonth(0, 1);
  }
  return localMidnightAsUtc(localDay.getUTCFullYear(), localDay.getUTCMonth() + 1, localDay.getUTCDate(), timeZone);
}

export function getPerformanceBuckets(
  matches: CompletedMatchRecord[],
  playerId: string,
  timeframe: AnalyticsTimeframe,
  now = new Date(),
  timeZone = "Asia/Karachi",
): PerformanceBucket[] {
  const useMonthlyBuckets = timeframe === "all" || timeframe === "12m" || timeframe === "6m" || timeframe === "3m";
  const buckets = new Map<string, PerformanceBucket>();
  const ordered = filterMatchesByTimeframe(matches, timeframe, now)
    .filter((match) => match.player1Id === playerId || match.player2Id === playerId)
    .sort((a, b) => a.completedAt.getTime() - b.completedAt.getTime());

  for (const match of ordered) {
    const { year, month, day } = localDateParts(match.completedAt, timeZone);
    let period: string;
    if (useMonthlyBuckets) {
      period = `${year}-${month}`;
    } else if (timeframe === "7d") {
      period = `${year}-${month}-${day}`;
    } else {
      const localMidnight = new Date(`${year}-${month}-${day}T00:00:00Z`);
      const daysFromMonday = (localMidnight.getUTCDay() + 6) % 7;
      localMidnight.setUTCDate(localMidnight.getUTCDate() - daysFromMonday);
      period = localMidnight.toISOString().slice(0, 10);
    }
    const bucket = buckets.get(period) ?? {
      period, wins: 0, losses: 0, gamesWon: 0, gamesLost: 0,
      pointsScored: 0, pointsConceded: 0, matches: 0, winRate: 0,
    };
    const perspective = getPlayerPerspective(match, playerId);
    bucket.matches += 1;
    bucket.wins += Number(perspective.won);
    bucket.losses += Number(!perspective.won);
    bucket.gamesWon += perspective.gamesWon;
    bucket.gamesLost += perspective.gamesLost;
    bucket.pointsScored += perspective.pointsScored;
    bucket.pointsConceded += perspective.pointsConceded;
    bucket.winRate = percentage(bucket.wins, bucket.matches);
    buckets.set(period, bucket);
  }
  return Array.from(buckets.values());
}

export type HeadToHeadTotals = {
  played: number;
  playerAWins: number;
  playerBWins: number;
  playerAGamesWon: number;
  playerBGamesWon: number;
  playerAPointsScored: number;
  playerBPointsScored: number;
  mostRecentAt: Date | null;
  recentResults: Array<{ id: string; completedAt: Date; winnerId: string; player1Id: string; player2Id: string; player1GamesWon: number; player2GamesWon: number }>;
};

export function calculateHeadToHead(
  input: CompletedMatchRecord[],
  playerAId: string,
  playerBId: string,
): HeadToHeadTotals {
  const matches = input
    .filter((match) => match.winnerId && ((match.player1Id === playerAId && match.player2Id === playerBId) || (match.player1Id === playerBId && match.player2Id === playerAId)))
    .sort((a, b) => b.completedAt.getTime() - a.completedAt.getTime() || b.id.localeCompare(a.id));
  let playerAGamesWon = 0;
  let playerBGamesWon = 0;
  let playerAPointsScored = 0;
  let playerBPointsScored = 0;
  for (const match of matches) {
    const aIsPlayer1 = match.player1Id === playerAId;
    playerAGamesWon += aIsPlayer1 ? match.player1GamesWon : match.player2GamesWon;
    playerBGamesWon += aIsPlayer1 ? match.player2GamesWon : match.player1GamesWon;
    playerAPointsScored += aIsPlayer1 ? match.player1TotalPoints : match.player2TotalPoints;
    playerBPointsScored += aIsPlayer1 ? match.player2TotalPoints : match.player1TotalPoints;
  }
  return {
    played: matches.length,
    playerAWins: matches.filter((match) => match.winnerId === playerAId).length,
    playerBWins: matches.filter((match) => match.winnerId === playerBId).length,
    playerAGamesWon,
    playerBGamesWon,
    playerAPointsScored,
    playerBPointsScored,
    mostRecentAt: matches[0]?.completedAt ?? null,
    recentResults: matches.slice(0, 10).map((match) => ({
      id: match.id,
      completedAt: match.completedAt,
      winnerId: match.winnerId!,
      player1Id: match.player1Id,
      player2Id: match.player2Id,
      player1GamesWon: match.player1GamesWon,
      player2GamesWon: match.player2GamesWon,
    })),
  };
}

export type LeaderboardPlayer = {
  id: string;
  played: number;
  won: number;
  winPercentage: number;
  gamesWon: number;
};

export function rankLeaderboard<T extends LeaderboardPlayer>(players: T[], matches: CompletedMatchRecord[], minimumMatches = 5): T[] {
  const headToHead = new Map<string, number>();
  for (const match of matches) {
    if (!match.winnerId) continue;
    const key = [match.player1Id, match.player2Id].sort().join(":");
    const signedWin = match.winnerId === key.split(":")[0] ? 1 : -1;
    headToHead.set(key, (headToHead.get(key) ?? 0) + signedWin);
  }
  return [...players].sort((a, b) => {
    if (a.played < minimumMatches || b.played < minimumMatches) {
      if (a.played < minimumMatches && b.played >= minimumMatches) return 1;
      if (b.played < minimumMatches && a.played >= minimumMatches) return -1;
    }
    const winRateDifference = b.won * a.played - a.won * b.played;
    if (winRateDifference !== 0) return winRateDifference;
    if (b.won !== a.won) return b.won - a.won;
    const pairKey = [a.id, b.id].sort().join(":");
    const result = headToHead.get(pairKey) ?? 0;
    if (result !== 0) return a.id < b.id ? -result : result;
    return a.id.localeCompare(b.id);
  });
}
