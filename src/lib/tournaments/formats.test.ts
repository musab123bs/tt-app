import assert from "node:assert/strict";
import test from "node:test";

import {
  calculateRoundRobinStandings,
  generateRoundRobinDraw,
  generateSingleEliminationDraw,
  getNextEliminationSlot,
} from "./formats.ts";

function entrants(count: number) {
  return Array.from({ length: count }, (_, index) => ({ playerId: `p${index + 1}`, seed: null }));
}

test("single elimination handles two participants without duplicate rounds", () => {
  const draw = generateSingleEliminationDraw(entrants(2), () => 0);
  assert.equal(draw.length, 1);
  assert.equal(draw[0]?.label, "Final");
  assert.equal(draw[0]?.fixtures.length, 1);
  assert.deepEqual([draw[0]?.fixtures[0]?.player1Id, draw[0]?.fixtures[0]?.player2Id].sort(), ["p1", "p2"]);
});

test("single elimination allocates the correct byes for five players", () => {
  const draw = generateSingleEliminationDraw(entrants(5), () => 0);
  assert.deepEqual(draw.map((round) => round.fixtures.length), [4, 2, 1]);
  assert.equal(draw[0]?.fixtures.filter((fixture) => fixture.status === "BYE").length, 3);
  assert.equal(draw[0]?.fixtures.filter((fixture) => fixture.status === "PENDING").length, 1);
  assert.equal(draw.flatMap((round) => round.fixtures).filter((fixture) => fixture.player1Id || fixture.player2Id).length >= 5, true);
  assert.equal(draw[1]?.fixtures.reduce((count, fixture) => count + Number(Boolean(fixture.player1Id)) + Number(Boolean(fixture.player2Id)), 0), 3);
});

test("single elimination supports a full eight-player bracket and unique entrants", () => {
  const draw = generateSingleEliminationDraw(entrants(8), () => 0.25);
  assert.deepEqual(draw.map((round) => round.fixtures.length), [4, 2, 1]);
  const firstRoundPlayers = draw[0]?.fixtures.flatMap((fixture) => [fixture.player1Id, fixture.player2Id]).filter(Boolean);
  assert.equal(new Set(firstRoundPlayers).size, 8);
  assert.equal(draw[0]?.fixtures.some((fixture) => fixture.status === "BYE"), false);
});

test("seeded players stay ordered ahead of randomized unseeded players", () => {
  const draw = generateSingleEliminationDraw([
    { playerId: "seed-2", seed: 2 },
    { playerId: "unseeded-a", seed: null },
    { playerId: "seed-1", seed: 1 },
    { playerId: "unseeded-b", seed: null },
  ], () => 0);
  assert.deepEqual(draw[0]?.fixtures.map((fixture) => [fixture.player1Id, fixture.player2Id]), [["seed-1", "seed-2"], ["unseeded-b", "unseeded-a"]]);
});

test("round robin creates each matchup once with an even player count", () => {
  const draw = generateRoundRobinDraw(entrants(4), () => 0);
  const pairs = draw.flatMap((round) => round.fixtures.map((fixture) => [fixture.player1Id, fixture.player2Id].sort().join(":")));
  assert.equal(draw.length, 3);
  assert.equal(pairs.length, 6);
  assert.equal(new Set(pairs).size, 6);
});

test("round robin gives an odd player count one bye per round", () => {
  const draw = generateRoundRobinDraw(entrants(5), () => 0.5);
  const pairs = draw.flatMap((round) => round.fixtures.map((fixture) => [fixture.player1Id, fixture.player2Id].sort().join(":")));
  assert.equal(draw.length, 5);
  assert.equal(draw.every((round) => round.fixtures.length === 2), true);
  assert.equal(pairs.length, 10);
  assert.equal(new Set(pairs).size, 10);
});

test("elimination winner positions map into the correct next-round slot", () => {
  assert.deepEqual(getNextEliminationSlot(1), { position: 1, slot: 1 });
  assert.deepEqual(getNextEliminationSlot(2), { position: 1, slot: 2 });
  assert.deepEqual(getNextEliminationSlot(3), { position: 2, slot: 1 });
  assert.deepEqual(getNextEliminationSlot(4), { position: 2, slot: 2 });
});

test("round-robin standings calculate match, game, point totals and head-to-head tie-breaks", () => {
  const players = ["a", "b", "c"].map((playerId) => ({ playerId, name: playerId.toUpperCase(), image: null }));
  const fixtures = [
    { player1Id: "a", player2Id: "b", winnerId: "a", status: "COMPLETED", match: { player1GamesWon: 3, player2GamesWon: 2, player1TotalPoints: 40, player2TotalPoints: 35 } },
    { player1Id: "b", player2Id: "c", winnerId: "b", status: "COMPLETED", match: { player1GamesWon: 3, player2GamesWon: 0, player1TotalPoints: 33, player2TotalPoints: 12 } },
    { player1Id: "c", player2Id: "a", winnerId: "c", status: "COMPLETED", match: { player1GamesWon: 3, player2GamesWon: 1, player1TotalPoints: 35, player2TotalPoints: 24 } },
  ];
  const standings = calculateRoundRobinStandings(players, fixtures);
  assert.equal(standings[0]?.playerId, "a");
  assert.deepEqual({ won: standings[0]?.matchesWon, played: standings[0]?.matchesPlayed, gamesWon: standings[0]?.gamesWon, gamesLost: standings[0]?.gamesLost, scored: standings[0]?.pointsScored, conceded: standings[0]?.pointsConceded }, { won: 1, played: 2, gamesWon: 4, gamesLost: 5, scored: 64, conceded: 70 });
  assert.deepEqual(standings.map((row) => row.position), [1, 2, 3]);
});

test("incomplete and abandoned fixtures do not affect standings", () => {
  const players = [{ playerId: "a", name: "A", image: null }, { playerId: "b", name: "B", image: null }];
  const standings = calculateRoundRobinStandings(players, [
    { player1Id: "a", player2Id: "b", winnerId: "a", status: "CANCELLED", match: { player1GamesWon: 3, player2GamesWon: 0, player1TotalPoints: 33, player2TotalPoints: 5 } },
  ]);
  assert.equal(standings[0]?.matchesPlayed, 0);
  assert.equal(standings[0]?.pointsScored, 0);
});
