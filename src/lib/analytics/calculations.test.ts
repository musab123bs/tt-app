import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateHeadToHead,
  calculatePlayerTotals,
  filterMatchesByTimeframe,
  getTimeframeStart,
  getLeaderboardPeriodStart,
  getPerformanceBuckets,
  rankLeaderboard,
  type CompletedMatchRecord,
  type LeaderboardPlayer,
} from "./calculations.ts";

const now = new Date("2026-06-30T12:00:00.000Z");
function match(
  id: string,
  winnerId: string,
  completedAt: string,
  p1 = "a",
  p2 = "b",
  p1Games = winnerId === p1 ? 3 : 1,
  p2Games = winnerId === p2 ? 3 : 1,
  p1Points = winnerId === p1 ? 33 : 21,
  p2Points = winnerId === p2 ? 33 : 21,
): CompletedMatchRecord {
  return {
    id, player1Id: p1, player2Id: p2, winnerId,
    completedAt: new Date(completedAt),
    player1GamesWon: p1Games, player2GamesWon: p2Games,
    player1TotalPoints: p1Points, player2TotalPoints: p2Points,
  };
}

test("zero-match totals are safe and return zero percentages", () => {
  const totals = calculatePlayerTotals([], "a");
  assert.equal(totals.played, 0);
  assert.equal(totals.winPercentage, 0);
  assert.equal(totals.lossPercentage, 0);
  assert.equal(totals.currentWinningStreak, 0);
  assert.equal(totals.currentLosingStreak, 0);
});

test("only-win and only-loss records compute percentages and streaks", () => {
  const wins = [1, 2, 3].map((day) => match(`w${day}`, "a", `2026-06-0${day}T12:00:00Z`));
  const losses = [1, 2, 3].map((day) => match(`l${day}`, "b", `2026-06-0${day}T12:00:00Z`));
  assert.equal(calculatePlayerTotals(wins, "a").winPercentage, 100);
  assert.equal(calculatePlayerTotals(wins, "a").currentWinningStreak, 3);
  assert.equal(calculatePlayerTotals(losses, "a").lossPercentage, 100);
  assert.equal(calculatePlayerTotals(losses, "a").currentLosingStreak, 3);
});

test("mixed results calculate wins, games, points, recent form, and streaks", () => {
  const records = [
    match("1", "a", "2026-06-10T08:00:00Z", "a", "b", 3, 1, 40, 28),
    match("2", "a", "2026-06-10T09:00:00Z", "a", "c", 3, 2, 52, 45),
    match("3", "b", "2026-06-11T08:00:00Z", "a", "b", 2, 3, 46, 51),
    match("4", "a", "2026-06-12T08:00:00Z", "a", "c", 3, 0, 33, 18),
  ];
  const totals = calculatePlayerTotals(records, "a");
  assert.equal(totals.played, 4);
  assert.equal(totals.won, 3);
  assert.equal(totals.lost, 1);
  assert.equal(totals.winPercentage, 75);
  assert.equal(totals.lossPercentage, 25);
  assert.equal(totals.gamesWon, 11);
  assert.equal(totals.gamesLost, 6);
  assert.equal(totals.pointsScored, 171);
  assert.equal(totals.pointsConceded, 142);
  assert.equal(totals.longestWinningStreak, 2);
  assert.equal(totals.longestLosingStreak, 1);
  assert.equal(totals.currentWinningStreak, 1);
  assert.equal(totals.recent5WinPercentage, 75);
});

test("same-day matches use completion time when calculating streaks", () => {
  const records = [
    match("later-loss", "b", "2026-06-10T10:00:00Z"),
    match("earlier-win", "a", "2026-06-10T09:00:00Z"),
  ];
  assert.equal(calculatePlayerTotals(records, "a").currentLosingStreak, 1);
  assert.equal(calculatePlayerTotals(records, "a").longestWinningStreak, 1);
});

test("head-to-head totals use only completed encounters between the pair", () => {
  const records = [
    match("a-won", "a", "2026-06-01T10:00:00Z", "a", "b", 3, 1, 35, 25),
    match("b-won", "b", "2026-06-02T10:00:00Z", "b", "a", 3, 2, 36, 31),
    match("other", "a", "2026-06-03T10:00:00Z", "a", "c"),
  ];
  const h2h = calculateHeadToHead(records, "a", "b");
  assert.equal(h2h.played, 2);
  assert.equal(h2h.playerAWins, 1);
  assert.equal(h2h.playerBWins, 1);
  assert.equal(h2h.playerAGamesWon, 5);
  assert.equal(h2h.playerBGamesWon, 4);
  assert.equal(h2h.playerAPointsScored, 66);
  assert.equal(h2h.recentResults[0]?.id, "b-won");
});

test("timeframes include boundary matches and exclude older or future matches", () => {
  const boundary = new Date(now);
  boundary.setUTCDate(boundary.getUTCDate() - 7);
  const records = [
    match("boundary", "a", boundary.toISOString()),
    match("old", "a", "2026-06-22T11:59:59Z"),
    match("future", "a", "2026-07-01T00:00:00Z"),
  ];
  assert.deepEqual(filterMatchesByTimeframe(records, "7d", now).map((entry) => entry.id), ["boundary"]);
});

test("month-based timeframes clamp short target months without overflowing", () => {
  assert.equal(getTimeframeStart("3m", new Date("2026-05-31T18:00:00.000Z"))?.toISOString(), "2026-02-28T18:00:00.000Z");
});

test("weekly and monthly buckets use Karachi calendar dates", () => {
  const records = [
    match("before-midnight-utc", "a", "2026-06-30T20:00:00Z"),
    match("same-local-day", "b", "2026-06-30T21:00:00Z"),
    match("next-month", "a", "2026-07-31T20:00:00Z"),
  ];
  assert.deepEqual(getPerformanceBuckets(records.slice(0, 2), "a", "7d", new Date("2026-07-07T12:00:00Z")).map((bucket) => bucket.period), ["2026-07-01"]);
  assert.deepEqual(getPerformanceBuckets(records, "a", "all", new Date("2026-08-02T12:00:00Z")).map((bucket) => bucket.period), ["2026-07", "2026-08"]);
});

test("leaderboard excludes low-history players from ranking above eligible players and breaks ties", () => {
  const players: LeaderboardPlayer[] = [
    { id: "low", played: 4, won: 4, winPercentage: 100, gamesWon: 12 },
    { id: "b", played: 8, won: 6, winPercentage: 75, gamesWon: 19 },
    { id: "a", played: 8, won: 6, winPercentage: 75, gamesWon: 22 },
  ];
  const records = [match("h2h", "b", "2026-06-10T10:00:00Z", "b", "a")];
  assert.deepEqual(rankLeaderboard(players, records).map((player) => player.id), ["b", "a", "low"]);
});

test("leaderboard periods start at Karachi local week, month, and year boundaries", () => {
  const instant = new Date("2026-07-15T12:00:00.000Z");
  assert.equal(getLeaderboardPeriodStart("weekly", instant)?.toISOString(), "2026-07-12T19:00:00.000Z");
  assert.equal(getLeaderboardPeriodStart("monthly", instant)?.toISOString(), "2026-06-30T19:00:00.000Z");
  assert.equal(getLeaderboardPeriodStart("yearly", instant)?.toISOString(), "2025-12-31T19:00:00.000Z");
});
