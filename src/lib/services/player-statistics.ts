import "server-only";

import { getPrismaClient } from "@/lib/prisma";

const profileFields = [
  { key: "fullName", label: "Full name" },
  { key: "profileImage", label: "Profile image" },
  { key: "bio", label: "Bio" },
  { key: "country", label: "Country" },
  { key: "city", label: "City" },
  { key: "clubName", label: "Club" },
  { key: "playingHand", label: "Playing hand" },
  { key: "playingStyle", label: "Playing style" },
  { key: "level", label: "Player level" },
] as const;

export type ProfileCompletion = {
  percentage: number;
  completedFields: number;
  totalFields: number;
  missingFields: string[];
};

export type RecentPlayerMatch = {
  id: string;
  opponentName: string;
  opponentImage: string | null;
  playedAt: string;
  format: string;
  finalScore: string;
  result: "Win" | "Loss" | "Scheduled" | "In progress" | "Abandoned";
  status: string;
};

export type PlayerDashboardStats = {
  player: {
    id: string;
    name: string;
    avatar: string | null;
    level: string | null;
    clubName: string | null;
    location: string | null;
  };
  matches: {
    total: number;
    wins: number;
    losses: number;
    winRate: number;
  };
  games: {
    won: number;
    lost: number;
  };
  points: {
    won: number;
    lost: number;
  };
  winningStreak: number;
  bestPerformance: string | null;
  profileCompletion: ProfileCompletion;
  matchPerformance: Array<{ date: string; wins: number; losses: number }>;
  gamePerformance: Array<{ label: string; won: number; lost: number }>;
  performanceTrend: Array<{ date: string; winRate: number }>;
  winLossDistribution: Array<{ name: "Wins" | "Losses"; value: number }>;
  recentMatches: RecentPlayerMatch[];
};

type CompletionProfile = {
  fullName: string | null;
  profileImage: string | null;
  bio: string | null;
  country: string | null;
  city: string | null;
  clubName: string | null;
  playingHand: string | null;
  playingStyle: string | null;
  level: string | null;
};

export function getPlayerProfileCompletion(
  profile: CompletionProfile | null,
  userImage: string | null,
): ProfileCompletion {
  const missingFields = profileFields
    .filter(({ key }) => {
      const value = key === "profileImage" ? profile?.profileImage || userImage : profile?.[key];
      return typeof value !== "string" || value.trim().length === 0;
    })
    .map(({ label }) => label);
  const completedFields = profileFields.length - missingFields.length;

  return {
    percentage: Math.round((completedFields / profileFields.length) * 100),
    completedFields,
    totalFields: profileFields.length,
    missingFields,
  };
}

export async function getPlayerDashboardStats(userId: string): Promise<PlayerDashboardStats> {
  const prisma = getPrismaClient();
  if (!prisma) {
    throw new Error("Dashboard data is unavailable because DATABASE_URL is not configured.");
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      playerProfile: {
        select: {
          fullName: true,
          profileImage: true,
          bio: true,
          country: true,
          city: true,
          clubName: true,
          playingHand: true,
          playingStyle: true,
          level: true,
        },
      },
    },
  });

  if (!user) {
    throw new Error("The authenticated player account could not be found.");
  }

  const profile = user.playerProfile;
  const completedMatches = await prisma.match.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ player1Id: userId }, { player2Id: userId }],
    },
    select: {
      player1Id: true,
      player2Id: true,
      winnerId: true,
      completedAt: true,
      player1GamesWon: true,
      player2GamesWon: true,
      player1TotalPoints: true,
      player2TotalPoints: true,
    },
    orderBy: { completedAt: "asc" },
  });

  const wins = completedMatches.filter((match) => match.winnerId === userId).length;
  const losses = completedMatches.length - wins;
  const games = completedMatches.reduce(
    (total, match) => {
      const player1 = match.player1Id === userId;
      return {
        won: total.won + (player1 ? match.player1GamesWon : match.player2GamesWon),
        lost: total.lost + (player1 ? match.player2GamesWon : match.player1GamesWon),
      };
    },
    { won: 0, lost: 0 },
  );
  const points = completedMatches.reduce(
    (total, match) => {
      const player1 = match.player1Id === userId;
      return {
        won: total.won + (player1 ? match.player1TotalPoints : match.player2TotalPoints),
        lost: total.lost + (player1 ? match.player2TotalPoints : match.player1TotalPoints),
      };
    },
    { won: 0, lost: 0 },
  );

  let winningStreak = 0;
  for (const match of [...completedMatches].reverse()) {
    if (match.winnerId !== userId) break;
    winningStreak += 1;
  }

  const performanceByDay = new Map<string, { wins: number; losses: number }>();
  let cumulativeWins = 0;
  const performanceTrend = completedMatches.map((match, index) => {
    const won = match.winnerId === userId;
    if (won) cumulativeWins += 1;
    const day = match.completedAt?.toISOString().slice(0, 10) ?? "Unknown";
    const daily = performanceByDay.get(day) ?? { wins: 0, losses: 0 };
    daily[won ? "wins" : "losses"] += 1;
    performanceByDay.set(day, daily);
    return {
      date: day,
      winRate: Math.round((cumulativeWins / (index + 1)) * 1000) / 10,
    };
  });

  const recentMatches = await prisma.match.findMany({
    where: { OR: [{ player1Id: userId }, { player2Id: userId }] },
    select: {
      id: true,
      player1Id: true,
      player2Id: true,
      bestOf: true,
      status: true,
      winnerId: true,
      scheduledAt: true,
      completedAt: true,
      player1GamesWon: true,
      player2GamesWon: true,
      player1: {
        select: {
          name: true,
          image: true,
          playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } },
        },
      },
      player2: {
        select: {
          name: true,
          image: true,
          playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } },
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { scheduledAt: "desc" }],
    take: 5,
  });

  const recentPlayerMatches: RecentPlayerMatch[] = recentMatches.map((match) => {
    const player1 = match.player1Id === userId;
    const opponent = player1 ? match.player2 : match.player1;
    const statusLabel: RecentPlayerMatch["result"] =
      match.status === "SCHEDULED"
        ? "Scheduled"
        : match.status === "IN_PROGRESS"
          ? "In progress"
          : match.status === "COMPLETED"
            ? match.winnerId === userId
              ? "Win"
              : "Loss"
            : "Abandoned";

    return {
      id: match.id,
      opponentName: opponent.playerProfile?.fullName?.trim() || opponent.name,
      opponentImage: opponent.playerProfile?.isPublic
        ? opponent.playerProfile.profileImage || opponent.image
        : null,
      playedAt: (match.completedAt ?? match.scheduledAt).toISOString(),
      format: `Best of ${match.bestOf}`,
      finalScore: player1
        ? `${match.player1GamesWon}–${match.player2GamesWon}`
        : `${match.player2GamesWon}–${match.player1GamesWon}`,
      result: statusLabel,
      status: match.status === "COMPLETED" ? "Completed" : match.status === "IN_PROGRESS" ? "In progress" : match.status === "SCHEDULED" ? "Scheduled" : "Abandoned",
    };
  });

  const bestWin = completedMatches
    .filter((match) => match.winnerId === userId)
    .reduce<number | null>((best, match) => {
      const player1 = match.player1Id === userId;
      const margin = player1
        ? match.player1GamesWon - match.player2GamesWon
        : match.player2GamesWon - match.player1GamesWon;
      return best === null || margin > best ? margin : best;
    }, null);

  const matches = {
    total: completedMatches.length,
    wins,
    losses,
    winRate: completedMatches.length ? (wins / completedMatches.length) * 100 : 0,
  };

  return {
    player: {
      id: user.id,
      name: profile?.fullName?.trim() || user.name,
      avatar: profile?.profileImage || user.image,
      level: profile?.level ?? null,
      clubName: profile?.clubName ?? null,
      location: [profile?.city, profile?.country].filter(Boolean).join(", ") || null,
    },
    matches,
    games,
    points,
    winningStreak,
    bestPerformance: bestWin === null ? null : `Best completed match win by ${bestWin} game${bestWin === 1 ? "" : "s"}.`,
    profileCompletion: getPlayerProfileCompletion(profile, user.image),
    matchPerformance: Array.from(performanceByDay, ([date, daily]) => ({ date, ...daily })),
    gamePerformance: games.won + games.lost ? [{ label: "All matches", won: games.won, lost: games.lost }] : [],
    performanceTrend,
    winLossDistribution: completedMatches.length
      ? [
          { name: "Wins" as const, value: wins },
          { name: "Losses" as const, value: losses },
        ]
      : [],
    recentMatches: recentPlayerMatches,
  };
}
