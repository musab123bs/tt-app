import assert from "node:assert/strict";
import test from "node:test";

import {
  decidingGameEndsHaveChanged,
  getFirstServerForNextGame,
  getGamesToWin,
  getGameWinner,
  getMatchWinner,
  getPlayerSides,
  getServerId,
} from "./scoring.ts";

test("games finish at 11 only with a two point lead", () => {
  assert.equal(getGameWinner(11, 0), 1);
  assert.equal(getGameWinner(11, 9), 1);
  assert.equal(getGameWinner(11, 10), null);
  assert.equal(getGameWinner(10, 11), null);
});

test("deuce games finish only after a two point lead", () => {
  assert.equal(getGameWinner(12, 10), 1);
  assert.equal(getGameWinner(13, 11), 1);
  assert.equal(getGameWinner(12, 11), null);
  assert.equal(getGameWinner(22, 20), 1);
});

test("service changes every two points before deuce", () => {
  const serverAt = (points: number) => getServerId("p1", "p1", "p2", points);
  assert.equal(serverAt(0), "p1");
  assert.equal(serverAt(1), "p1");
  assert.equal(serverAt(2), "p2");
  assert.equal(serverAt(3), "p2");
  assert.equal(serverAt(4), "p1");
  assert.equal(serverAt(18), "p2");
  assert.equal(serverAt(19), "p2");
});

test("service alternates every point once the game reaches 10-10", () => {
  const serverAt = (points: number) => getServerId("p1", "p1", "p2", points);
  assert.equal(serverAt(20), "p1");
  assert.equal(serverAt(21), "p2");
  assert.equal(serverAt(22), "p1");
  assert.equal(serverAt(23), "p2");
});

test("the first server alternates between games", () => {
  assert.equal(getFirstServerForNextGame("p1", "p1", "p2"), "p2");
  assert.equal(getFirstServerForNextGame("p2", "p1", "p2"), "p1");
});

test("best-of match formats use the correct win threshold", () => {
  assert.equal(getGamesToWin(3), 2);
  assert.equal(getGamesToWin(5), 3);
  assert.equal(getGamesToWin(7), 4);
  assert.equal(getMatchWinner(1, 1, 3), null);
  assert.equal(getMatchWinner(2, 0, 3), 1);
  assert.equal(getMatchWinner(3, 2, 5), 1);
  assert.equal(getMatchWinner(3, 3, 7), null);
  assert.equal(getMatchWinner(4, 3, 7), 1);
});

test("ends change in the deciding game when a player first reaches five", () => {
  const points = [
    { action: "POINT" as const, scorePlayer1: 4, scorePlayer2: 4, sequence: 8 },
    { action: "POINT" as const, scorePlayer1: 5, scorePlayer2: 4, sequence: 9 },
  ];

  assert.equal(decidingGameEndsHaveChanged(5, 4, points), false);
  assert.equal(decidingGameEndsHaveChanged(5, 5, points), true);
  assert.deepEqual(getPlayerSides(3, 5, points), { player1: "left", player2: "right" });
  assert.deepEqual(getPlayerSides(5, 5, points), { player1: "right", player2: "left" });
});

test("undoing the point that reached five reverses the deciding end change", () => {
  const points = [
    { action: "POINT" as const, scorePlayer1: 5, scorePlayer2: 4, sequence: 9, undoneAt: "now" },
  ];

  assert.equal(decidingGameEndsHaveChanged(3, 3, points), false);
});
