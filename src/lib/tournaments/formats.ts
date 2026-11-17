export type TournamentEntrant = { playerId: string; seed: number | null };
export type TournamentFixtureSeed = {
  roundNumber: number;
  position: number;
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  status: "PENDING" | "BYE";
};
export type TournamentRoundSeed = { number: number; label: string; fixtures: TournamentFixtureSeed[] };

function shuffle<T>(items: T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

function entrantOrder(entrants: TournamentEntrant[], random: () => number) {
  const seeded = entrants.filter((entrant) => entrant.seed !== null).sort((a, b) => a.seed! - b.seed!);
  const unseeded = shuffle(entrants.filter((entrant) => entrant.seed === null), random);
  return [...seeded, ...unseeded];
}

function roundLabel(number: number, totalRounds: number) {
  const roundsLeft = totalRounds - number;
  if (roundsLeft === 0) return "Final";
  if (roundsLeft === 1) return "Semi-final";
  if (roundsLeft === 2) return "Quarter-final";
  return `Round ${number}`;
}

export function generateSingleEliminationDraw(
  entrants: TournamentEntrant[],
  random: () => number = Math.random,
): TournamentRoundSeed[] {
  if (entrants.length < 2) throw new Error("At least two approved players are required.");
  const capacity = 2 ** Math.ceil(Math.log2(entrants.length));
  const totalRounds = Math.log2(capacity);
  const ordered = entrantOrder(entrants, random);
  const matchCount = entrants.length - capacity / 2;
  const byeCount = capacity / 2 - matchCount;
  const firstFixtures: TournamentFixtureSeed[] = [];
  let cursor = 0;

  for (let position = 1; position <= capacity / 2; position += 1) {
    if (position <= byeCount) {
      const player1Id = ordered[cursor++]!.playerId;
      firstFixtures.push({ roundNumber: 1, position, player1Id, player2Id: null, winnerId: player1Id, status: "BYE" });
    } else {
      firstFixtures.push({
        roundNumber: 1,
        position,
        player1Id: ordered[cursor++]!.playerId,
        player2Id: ordered[cursor++]!.playerId,
        winnerId: null,
        status: "PENDING",
      });
    }
  }

  const rounds: TournamentRoundSeed[] = [{ number: 1, label: roundLabel(1, totalRounds), fixtures: firstFixtures }];
  for (let number = 2; number <= totalRounds; number += 1) {
    const fixtures = Array.from({ length: capacity / 2 ** number }, (_, index) => ({
      roundNumber: number,
      position: index + 1,
      player1Id: null,
      player2Id: null,
      winnerId: null,
      status: "PENDING" as const,
    }));
    rounds.push({ number, label: roundLabel(number, totalRounds), fixtures });
  }

  for (const bye of firstFixtures.filter((fixture) => fixture.status === "BYE")) {
    const next = rounds[1]?.fixtures[Math.ceil(bye.position / 2) - 1];
    if (next) {
      if (bye.position % 2 === 1) next.player1Id = bye.winnerId;
      else next.player2Id = bye.winnerId;
    }
  }
  return rounds;
}

export function generateRoundRobinDraw(
  entrants: TournamentEntrant[],
  random: () => number = Math.random,
): TournamentRoundSeed[] {
  if (entrants.length < 2) throw new Error("At least two approved players are required.");
  const ordered = entrantOrder(entrants, random).map((entrant) => entrant.playerId);
  if (ordered.length % 2 === 1) ordered.push("");
  const circle = [...ordered];
  const rounds: TournamentRoundSeed[] = [];
  const roundCount = circle.length - 1;
  const matchesPerRound = circle.length / 2;

  for (let round = 0; round < roundCount; round += 1) {
    const fixtures: TournamentFixtureSeed[] = [];
    for (let index = 0; index < matchesPerRound; index += 1) {
      const player1Id = circle[index]!;
      const player2Id = circle[circle.length - 1 - index]!;
      if (!player1Id || !player2Id) continue;
      fixtures.push({
        roundNumber: round + 1,
        position: fixtures.length + 1,
        player1Id,
        player2Id,
        winnerId: null,
        status: "PENDING",
      });
    }
    rounds.push({ number: round + 1, label: `Round ${round + 1}`, fixtures });
    const fixed = circle[0]!;
    const rotating = circle.slice(1);
    rotating.unshift(rotating.pop()!);
    circle.splice(0, circle.length, fixed, ...rotating);
  }
  return rounds;
}

export function getNextEliminationSlot(currentPosition: number) {
  return {
    position: Math.ceil(currentPosition / 2),
    slot: currentPosition % 2 === 1 ? 1 as const : 2 as const,
  };
}

export type StandingParticipant = { playerId: string; name: string; image: string | null };
export type StandingFixture = {
  player1Id: string | null;
  player2Id: string | null;
  winnerId: string | null;
  status: string;
  match: {
    player1GamesWon: number;
    player2GamesWon: number;
    player1TotalPoints: number;
    player2TotalPoints: number;
  } | null;
};
export type TournamentStanding = StandingParticipant & {
  position: number;
  matchesPlayed: number;
  matchesWon: number;
  matchesLost: number;
  gamesWon: number;
  gamesLost: number;
  pointsScored: number;
  pointsConceded: number;
  pointsDifference: number;
  gameDifference: number;
};

export const DEFAULT_TIE_BREAK_ORDER = ["MATCH_WIN_PERCENTAGE", "HEAD_TO_HEAD", "GAME_DIFFERENCE", "POINT_DIFFERENCE"] as const;
export type TieBreakRule = (typeof DEFAULT_TIE_BREAK_ORDER)[number];

export function calculateRoundRobinStandings(
  participants: StandingParticipant[],
  fixtures: StandingFixture[],
  tieBreakOrder: TieBreakRule[] = [...DEFAULT_TIE_BREAK_ORDER],
): TournamentStanding[] {
  const rows = new Map(participants.map((player) => [player.playerId, {
    ...player,
    position: 0,
    matchesPlayed: 0,
    matchesWon: 0,
    matchesLost: 0,
    gamesWon: 0,
    gamesLost: 0,
    pointsScored: 0,
    pointsConceded: 0,
    pointsDifference: 0,
    gameDifference: 0,
  }] satisfies [string, TournamentStanding]));
  const headToHead = new Map<string, number>();

  for (const fixture of fixtures) {
    if (fixture.status !== "COMPLETED" || !fixture.winnerId || !fixture.player1Id || !fixture.player2Id || !fixture.match) continue;
    const player1 = rows.get(fixture.player1Id);
    const player2 = rows.get(fixture.player2Id);
    if (!player1 || !player2) continue;
    player1.matchesPlayed += 1;
    player2.matchesPlayed += 1;
    player1.matchesWon += Number(fixture.winnerId === player1.playerId);
    player2.matchesWon += Number(fixture.winnerId === player2.playerId);
    player1.matchesLost += Number(fixture.winnerId === player2.playerId);
    player2.matchesLost += Number(fixture.winnerId === player1.playerId);
    player1.gamesWon += fixture.match.player1GamesWon;
    player1.gamesLost += fixture.match.player2GamesWon;
    player2.gamesWon += fixture.match.player2GamesWon;
    player2.gamesLost += fixture.match.player1GamesWon;
    player1.pointsScored += fixture.match.player1TotalPoints;
    player1.pointsConceded += fixture.match.player2TotalPoints;
    player2.pointsScored += fixture.match.player2TotalPoints;
    player2.pointsConceded += fixture.match.player1TotalPoints;
    const key = [player1.playerId, player2.playerId].sort().join(":");
    const signed = fixture.winnerId === key.split(":")[0] ? 1 : -1;
    headToHead.set(key, (headToHead.get(key) ?? 0) + signed);
  }

  for (const row of rows.values()) {
    row.gameDifference = row.gamesWon - row.gamesLost;
    row.pointsDifference = row.pointsScored - row.pointsConceded;
  }
  const compare = (a: TournamentStanding, b: TournamentStanding, rule: TieBreakRule): number => {
    if (rule === "MATCH_WIN_PERCENTAGE") {
      return b.matchesWon * a.matchesPlayed - a.matchesWon * b.matchesPlayed;
    }
    if (rule === "HEAD_TO_HEAD") {
      return -(headToHead.get([a.playerId, b.playerId].sort().join(":")) ?? 0) * (a.playerId < b.playerId ? 1 : -1);
    }
    if (rule === "GAME_DIFFERENCE") return b.gameDifference - a.gameDifference;
    return b.pointsDifference - a.pointsDifference;
  };
  const standings = [...rows.values()].sort((a, b) => {
    for (const rule of tieBreakOrder) {
      const result = compare(a, b, rule);
      if (result) return result;
    }
    return a.playerId.localeCompare(b.playerId);
  });
  return standings.map((row, index) => ({ ...row, position: index + 1 }));
}
