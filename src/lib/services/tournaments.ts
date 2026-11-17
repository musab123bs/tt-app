import "server-only";

import { Prisma, TournamentFixtureStatus, TournamentParticipantStatus, TournamentStatus, type PrismaClient } from "@/generated/prisma";
import {
  calculateRoundRobinStandings,
  DEFAULT_TIE_BREAK_ORDER,
  generateRoundRobinDraw,
  generateSingleEliminationDraw,
  type TieBreakRule,
} from "@/lib/tournaments/formats";
import { getPrismaClient } from "@/lib/prisma";
import { createTournamentFixtureMatch, forfeitTournamentParticipant } from "@/lib/services/tournament-match-sync";
import { notifyUsers } from "@/lib/services/notifications";
import { AccountRestrictedError, assertAccountActive } from "@/lib/services/account-status";
import { getPlatformSettings } from "@/lib/services/platform-settings";
import { isAdminRole } from "@/lib/roles";
import type { z } from "zod";
import { tournamentCreateSchema } from "@/lib/tournaments/validation";

export class TournamentError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "TournamentError";
  }
}

type CreateTournament = z.infer<typeof tournamentCreateSchema>;

async function ensureActive(userId: string) {
  try {
    await assertAccountActive(userId);
  } catch (error) {
    if (error instanceof AccountRestrictedError) throw new TournamentError(error.message, 403);
    throw error;
  }
}

function getTieBreakOrder(value?: string): TieBreakRule[] {
  const allowed = new Set<string>(DEFAULT_TIE_BREAK_ORDER);
  const parsed = value?.split(",").filter((rule): rule is TieBreakRule => allowed.has(rule)) ?? [];
  return parsed.length ? parsed : [...DEFAULT_TIE_BREAK_ORDER];
}

async function assertOrganizer(userId: string, tournamentId: string, db?: PrismaClient | Prisma.TransactionClient) {
  const tx = db ?? getPrismaClient();
  if (!tx) throw new TournamentError("Database unavailable.", 503);
  const tournament = await tx.tournament.findUnique({ where: { id: tournamentId }, select: { id: true, createdById: true, status: true, drawGeneratedAt: true } });
  if (!tournament) throw new TournamentError("Tournament not found.", 404);
  const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
  if (tournament.createdById !== userId && !isAdminRole(user?.role)) throw new TournamentError("Only this tournament's organizer or an administrator can do that.", 403);
  return tournament;
}

function validateTournamentDates(input: { startDate: Date; endDate: Date; registrationDeadline: Date; minParticipants: number; maxParticipants: number }, now = new Date()) {
  if (![input.startDate, input.endDate, input.registrationDeadline].every((date) => !Number.isNaN(date.getTime()))) {
    throw new TournamentError("Enter valid tournament dates.", 400);
  }
  if (input.endDate <= input.startDate) throw new TournamentError("Tournament end must be after its start.", 400);
  if (input.registrationDeadline > input.startDate) throw new TournamentError("Registration deadline must be on or before the tournament start.", 400);
  if (input.maxParticipants < input.minParticipants || input.minParticipants < 2 || input.maxParticipants > 256) {
    throw new TournamentError("Participant limits must be between 2 and 256, with minimum no greater than maximum.", 400);
  }
  if (input.registrationDeadline <= now && input.startDate > now) {
    throw new TournamentError("Registration deadline must be in the future for an upcoming tournament.", 400);
  }
}

export async function getTournaments(options: { userId?: string; scope?: "all" | "mine" }) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  if (options.scope === "mine" && !options.userId) throw new TournamentError("Sign in to view your tournaments.", 401);
  const where: Prisma.TournamentWhereInput = options.scope === "mine"
    ? { OR: [{ createdById: options.userId }, { participants: { some: { userId: options.userId, status: { in: ["PENDING", "APPROVED"] } } } }] }
    : { OR: [{ status: { not: "DRAFT" } }, ...(options.userId ? [{ createdById: options.userId }] : [])] };
  const tournaments = await prisma.tournament.findMany({
    where,
    include: {
      createdBy: { select: { id: true, name: true, playerProfile: { select: { fullName: true, isPublic: true } } } },
      winner: { select: { id: true, name: true } },
      _count: { select: { participants: true, fixtures: true } },
    },
    orderBy: [{ startDate: "asc" }, { createdAt: "desc" }],
    take: 100,
  });
  const counts = await prisma.tournamentParticipant.groupBy({
    by: ["tournamentId"],
    where: { tournamentId: { in: tournaments.map((tournament) => tournament.id) }, status: { in: ["PENDING", "APPROVED"] } },
    _count: { _all: true },
  });
  const participantCount = new Map(counts.map((count) => [count.tournamentId, count._count._all]));
  const myRegistrations = options.userId ? await prisma.tournamentParticipant.findMany({
    where: { userId: options.userId, tournamentId: { in: tournaments.map((tournament) => tournament.id) } },
    select: { tournamentId: true, status: true },
  }) : [];
  const myStatus = new Map(myRegistrations.map((registration) => [registration.tournamentId, registration.status]));
  return tournaments.map((tournament) => ({
    id: tournament.id,
    name: tournament.name,
    description: tournament.description,
    bannerImage: tournament.bannerImage,
    location: tournament.location,
    startDate: tournament.startDate.toISOString(),
    endDate: tournament.endDate.toISOString(),
    registrationDeadline: tournament.registrationDeadline.toISOString(),
    format: tournament.format,
    status: tournament.status,
    maxParticipants: tournament.maxParticipants,
    minParticipants: tournament.minParticipants,
    bestOf: tournament.bestOf,
    createdById: tournament.createdById,
    organizerName: tournament.createdBy.playerProfile?.isPublic ? tournament.createdBy.playerProfile.fullName?.trim() || tournament.createdBy.name : "Private organizer",
    winnerId: tournament.winner?.id ?? null,
    winnerName: tournament.winner?.name ?? null,
    participantCount: participantCount.get(tournament.id) ?? 0,
    fixtureCount: tournament._count.fixtures,
    runnerUpId: tournament.runnerUpId,
    myRegistrationStatus: myStatus.get(tournament.id) ?? null,
  }));
}

export async function getTournamentDetail(tournamentId: string, viewerId?: string, viewerIsAdmin = false) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  const tournament = await prisma.tournament.findUnique({
    where: { id: tournamentId },
    include: {
      createdBy: { select: { id: true, name: true, playerProfile: { select: { fullName: true, isPublic: true } } } },
      winner: { select: { id: true, name: true, playerProfile: { select: { fullName: true, isPublic: true } } } },
      runnerUp: { select: { id: true, name: true, playerProfile: { select: { fullName: true, isPublic: true } } } },
      participants: {
        where: viewerId
          ? viewerIsAdmin ? {} : { OR: [{ status: "APPROVED" }, { userId: viewerId }, { tournament: { createdById: viewerId }, status: { in: ["PENDING", "REJECTED", "WITHDRAWN", "REMOVED"] as TournamentParticipantStatus[] } }] }
          : { status: "APPROVED" },
        include: { user: { select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, isPublic: true, level: true } } } } },
        orderBy: [{ seed: "asc" }, { registeredAt: "asc" }],
      },
      rounds: {
        orderBy: { number: "asc" },
        include: {
          fixtures: {
            orderBy: { position: "asc" },
            include: {
              player1: { select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } } } },
              player2: { select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } } } },
              winner: { select: { id: true, name: true, playerProfile: { select: { fullName: true, isPublic: true } } } },
              loser: { select: { id: true, name: true, playerProfile: { select: { fullName: true, isPublic: true } } } },
              match: { select: { id: true, status: true, scheduledAt: true, completedAt: true, winnerId: true, player1GamesWon: true, player2GamesWon: true, player1TotalPoints: true, player2TotalPoints: true } },
            },
          },
        },
      },
    },
  });
  if (!tournament) return null;
  if (tournament.status === "DRAFT" && viewerId !== tournament.createdById && !viewerIsAdmin) return null;
  const isOrganizer = viewerId === tournament.createdById || viewerIsAdmin;
  const standings = tournament.format === "ROUND_ROBIN" && tournament.drawGeneratedAt ? await getRoundRobinStandings(tournament.id, getTieBreakOrder(tournament.tieBreakOrder)) : [];
  return {
    id: tournament.id,
    createdById: tournament.createdById,
    organizerName: tournament.createdBy.playerProfile?.isPublic ? tournament.createdBy.playerProfile.fullName?.trim() || tournament.createdBy.name : "Private organizer",
    name: tournament.name,
    description: tournament.description,
    bannerImage: tournament.bannerImage,
    location: tournament.location,
    startDate: tournament.startDate.toISOString(),
    endDate: tournament.endDate.toISOString(),
    registrationDeadline: tournament.registrationDeadline.toISOString(),
    format: tournament.format,
    status: tournament.status,
    maxParticipants: tournament.maxParticipants,
    minParticipants: tournament.minParticipants,
    bestOf: tournament.bestOf,
    registrationRequiresApproval: tournament.registrationRequiresApproval,
    rules: tournament.rules,
    tieBreakOrder: getTieBreakOrder(tournament.tieBreakOrder),
    drawGeneratedAt: tournament.drawGeneratedAt?.toISOString() ?? null,
    completedAt: tournament.completedAt?.toISOString() ?? null,
    winner: tournament.winner ? { id: tournament.winner.id, name: tournament.winner.playerProfile?.isPublic ? tournament.winner.playerProfile.fullName?.trim() || tournament.winner.name : "Private player" } : null,
    runnerUp: tournament.runnerUp ? { id: tournament.runnerUp.id, name: tournament.runnerUp.playerProfile?.isPublic ? tournament.runnerUp.playerProfile.fullName?.trim() || tournament.runnerUp.name : "Private player" } : null,
    isOrganizer,
    standings,
    myRegistration: tournament.participants.find((participant) => participant.userId === viewerId) ?? null,
    participants: tournament.participants.map((participant) => ({
      id: participant.id,
      userId: participant.userId,
      name: isOrganizer || viewerId === participant.userId || !participant.user.playerProfile || participant.user.playerProfile.isPublic
        ? participant.user.playerProfile?.fullName?.trim() || participant.user.name
        : "Private player",
      image: isOrganizer || viewerId === participant.userId || !participant.user.playerProfile || participant.user.playerProfile.isPublic
        ? participant.user.playerProfile?.profileImage || participant.user.image
        : null,
      level: participant.user.playerProfile?.level ?? null,
      status: participant.status,
      seed: participant.seed,
      registeredAt: participant.registeredAt.toISOString(),
      removedReason: isOrganizer ? participant.removedReason : null,
    })),
    rounds: tournament.rounds.map((round) => ({
      id: round.id,
      number: round.number,
      label: round.label,
      status: round.status,
      fixtures: round.fixtures.map((fixture) => ({
        id: fixture.id,
        position: fixture.position,
        player1: serializeTournamentFixturePlayer(fixture.player1),
        player2: serializeTournamentFixturePlayer(fixture.player2),
        winnerId: fixture.winnerId,
        winnerName: fixture.winner ? fixture.winner.playerProfile?.isPublic ? fixture.winner.playerProfile.fullName?.trim() || fixture.winner.name : "Private player" : null,
        forfeitPlayerName: fixture.loser ? fixture.loser.playerProfile?.isPublic ? fixture.loser.playerProfile.fullName?.trim() || fixture.loser.name : "Private player" : null,
        status: fixture.status,
        scheduledAt: fixture.scheduledAt?.toISOString() ?? null,
        match: fixture.match ? {
          id: fixture.match.id,
          status: fixture.match.status,
          scheduledAt: fixture.match.scheduledAt.toISOString(),
          completedAt: fixture.match.completedAt?.toISOString() ?? null,
          winnerId: fixture.match.winnerId,
          player1GamesWon: fixture.match.player1GamesWon,
          player2GamesWon: fixture.match.player2GamesWon,
          player1TotalPoints: fixture.match.player1TotalPoints,
          player2TotalPoints: fixture.match.player2TotalPoints,
        } : null,
      })),
    })),
  };
}

async function getRoundRobinStandings(tournamentId: string, tieBreakOrder: TieBreakRule[]) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  const [participants, fixtures] = await Promise.all([
    prisma.tournamentParticipant.findMany({
      where: { tournamentId, status: { in: ["APPROVED", "WITHDRAWN", "REMOVED"] } },
      include: { user: { select: { id: true, name: true, image: true, playerProfile: { select: { fullName: true, profileImage: true, isPublic: true } } } } },
    }),
    prisma.tournamentFixture.findMany({
      where: { tournamentId },
      select: { player1Id: true, player2Id: true, winnerId: true, status: true, match: { select: { player1GamesWon: true, player2GamesWon: true, player1TotalPoints: true, player2TotalPoints: true } } },
    }),
  ]);
  const scheduled = new Set(fixtures.flatMap((fixture) => [fixture.player1Id, fixture.player2Id]).filter(Boolean));
  return calculateRoundRobinStandings(
    participants.filter((participant) => scheduled.has(participant.userId)).map((participant) => ({
      playerId: participant.userId,
      name: participant.user.playerProfile?.fullName?.trim() || participant.user.name,
      image: participant.user.playerProfile?.isPublic ? participant.user.playerProfile.profileImage || participant.user.image : null,
    })),
    fixtures,
    tieBreakOrder,
  );
}

function serializeTournamentFixturePlayer(player: { id: string; name: string; image: string | null; playerProfile: { fullName: string; profileImage: string | null; isPublic: boolean } | null } | null) {
  if (!player) return null;
  return {
    id: player.id,
    name: player.playerProfile?.fullName?.trim() || player.name,
    image: player.playerProfile?.isPublic ? player.playerProfile.profileImage || player.image : null,
  };
}

export async function createTournament(userId: string, input: CreateTournament) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  const dates = { startDate: new Date(input.startDate), endDate: new Date(input.endDate), registrationDeadline: new Date(input.registrationDeadline), minParticipants: input.minParticipants, maxParticipants: input.maxParticipants };
  await ensureActive(userId);
  validateTournamentDates(dates);
  const settings = await getPlatformSettings();
  if (!settings.tournament.availableFormats.includes(input.format)) throw new TournamentError("This tournament format is not currently available.", 400);
  if (!settings.match.availableBestOf.includes(input.bestOf)) throw new TournamentError(`Best of ${input.bestOf} matches are not currently available.`, 400);
  if (dates.startDate <= new Date()) throw new TournamentError("Tournament start must be in the future.", 400);
  if (input.status === "OPEN_REGISTRATION" && dates.registrationDeadline <= new Date()) throw new TournamentError("Open registration needs a future deadline.", 400);
  const data = await prisma.tournament.create({
    data: {
      createdById: userId,
      name: input.name,
      description: input.description || null,
      bannerImage: input.bannerImage || null,
      location: input.location || null,
      startDate: dates.startDate,
      endDate: dates.endDate,
      registrationDeadline: dates.registrationDeadline,
      format: input.format,
      status: input.status as TournamentStatus,
      maxParticipants: input.maxParticipants,
      minParticipants: input.minParticipants,
      bestOf: input.bestOf,
      registrationRequiresApproval: input.registrationRequiresApproval,
      rules: input.rules || null,
      tieBreakOrder: (input.tieBreakOrder ?? [...DEFAULT_TIE_BREAK_ORDER]).join(","),
    },
  });
  return data;
}

export async function updateTournament(userId: string, tournamentId: string, input: Record<string, unknown>) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  const current = await assertOrganizer(userId, tournamentId, prisma);
  if (current.drawGeneratedAt || (current.status !== "DRAFT" && current.status !== "OPEN_REGISTRATION")) {
    throw new TournamentError("Tournament settings are locked after the draw is generated or competition begins.", 409);
  }
  const tournament = await prisma.tournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) throw new TournamentError("Tournament not found.", 404);
  if (input.status === "CANCELLED") return cancelTournament(userId, tournamentId);
  if (input.status && input.status !== "DRAFT" && input.status !== "OPEN_REGISTRATION") {
    throw new TournamentError("Use the registration controls to close registration or generate the draw.", 400);
  }

  const startDate = input.startDate ? new Date(String(input.startDate)) : tournament.startDate;
  const endDate = input.endDate ? new Date(String(input.endDate)) : tournament.endDate;
  const registrationDeadline = input.registrationDeadline ? new Date(String(input.registrationDeadline)) : tournament.registrationDeadline;
  const minParticipants = typeof input.minParticipants === "number" ? input.minParticipants : tournament.minParticipants;
  const maxParticipants = typeof input.maxParticipants === "number" ? input.maxParticipants : tournament.maxParticipants;
  validateTournamentDates({ startDate, endDate, registrationDeadline, minParticipants, maxParticipants });
  const hasRegistrations = await prisma.tournamentParticipant.count({ where: { tournamentId, status: { in: ["PENDING", "APPROVED"] } } });
  const lockedKeys = ["format", "maxParticipants", "minParticipants", "bestOf", "registrationRequiresApproval"] as const;
  if (hasRegistrations && lockedKeys.some((key) => input[key] !== undefined && input[key] !== tournament[key])) {
    throw new TournamentError("Format and participant settings cannot change after players register.", 409);
  }
  if (input.status === "DRAFT" && hasRegistrations) throw new TournamentError("Withdraw or reject current registrations before reopening a draft.", 409);
  if (input.status === "OPEN_REGISTRATION" && registrationDeadline <= new Date()) throw new TournamentError("Open registration needs a future deadline.", 400);

  const updated = await prisma.tournament.update({
    where: { id: tournamentId },
    data: {
      ...(typeof input.name === "string" ? { name: input.name } : {}),
      ...(typeof input.description === "string" ? { description: input.description || null } : {}),
      ...(typeof input.bannerImage === "string" ? { bannerImage: input.bannerImage || null } : {}),
      ...(typeof input.location === "string" ? { location: input.location || null } : {}),
      ...(input.startDate !== undefined ? { startDate } : {}),
      ...(input.endDate !== undefined ? { endDate } : {}),
      ...(input.registrationDeadline !== undefined ? { registrationDeadline } : {}),
      ...(typeof input.format === "string" ? { format: input.format as "SINGLE_ELIMINATION" | "ROUND_ROBIN" } : {}),
      ...(typeof input.status === "string" ? { status: input.status as TournamentStatus } : {}),
      ...(input.maxParticipants !== undefined ? { maxParticipants } : {}),
      ...(input.minParticipants !== undefined ? { minParticipants } : {}),
      ...(input.bestOf !== undefined ? { bestOf: input.bestOf as number } : {}),
      ...(typeof input.registrationRequiresApproval === "boolean" ? { registrationRequiresApproval: input.registrationRequiresApproval } : {}),
      ...(typeof input.rules === "string" ? { rules: input.rules || null } : {}),
      ...(Array.isArray(input.tieBreakOrder) ? { tieBreakOrder: (input.tieBreakOrder as string[]).join(",") } : {}),
    },
  });
  return updated;
}

export async function registerForTournament(userId: string, tournamentId: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  const [user, tournament] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId }, select: { role: true } }),
    prisma.tournament.findUnique({ where: { id: tournamentId } }),
  ]);
  if (!user || user.role !== "PLAYER") throw new TournamentError("Only registered players can enter tournaments.", 403);
  await ensureActive(userId);
  if (!tournament) throw new TournamentError("Tournament not found.", 404);
  const now = new Date();
  if (tournament.status !== "OPEN_REGISTRATION" || now >= tournament.registrationDeadline) throw new TournamentError("Registration is closed.", 409);
  const activeCount = await prisma.tournamentParticipant.count({ where: { tournamentId, status: { in: ["PENDING", "APPROVED"] } } });
  if (activeCount >= tournament.maxParticipants) throw new TournamentError("This tournament has reached its participant limit.", 409);
  try {
    const participant = await prisma.tournamentParticipant.create({
      data: { tournamentId, userId, status: tournament.registrationRequiresApproval ? "PENDING" : "APPROVED" },
      select: { id: true, status: true, registeredAt: true },
    });
    const link = `/tournaments/${tournamentId}`;
    await notifyUsers(prisma, [userId], {
      type: "TOURNAMENT_REGISTRATION",
      title: participant.status === "PENDING" ? `Registration submitted for ${tournament.name}` : `You're registered for ${tournament.name}`,
      body: participant.status === "PENDING" ? "The organizer will review your registration." : "Your place in the tournament is confirmed.",
      link,
      dedupeKey: `registration:${participant.id}:${participant.status}`,
    });
    if (participant.status === "PENDING") {
      await notifyUsers(prisma, [tournament.createdById], { type: "TOURNAMENT_REGISTRATION", title: `New registration request for ${tournament.name}`, link, dedupeKey: `registration-request:${participant.id}` });
    }
    return participant;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") throw new TournamentError("You have already registered for this tournament.", 409);
    throw error;
  }
}

export async function cancelOwnRegistration(userId: string, tournamentId: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({ where: { id: tournamentId } });
    if (!tournament) throw new TournamentError("Tournament not found.", 404);
    if (tournament.drawGeneratedAt || tournament.status !== "OPEN_REGISTRATION" || new Date() >= tournament.registrationDeadline) {
      throw new TournamentError("Registration can only be cancelled before the deadline and draw.", 409);
    }
    const participant = await tx.tournamentParticipant.findUnique({ where: { tournamentId_userId: { tournamentId, userId } } });
    if (!participant || (participant.status !== "APPROVED" && participant.status !== "PENDING")) throw new TournamentError("No active registration was found.", 404);
    return tx.tournamentParticipant.update({ where: { id: participant.id }, data: { status: "WITHDRAWN" } });
  });
}

export async function reviewTournamentRegistration(userId: string, tournamentId: string, input: { participantId: string; decision: "APPROVE" | "REJECT" | "REMOVE"; reason?: string; seed?: number | null }) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  return prisma.$transaction(async (tx) => {
    const tournament = await assertOrganizer(userId, tournamentId, tx);
    const participant = await tx.tournamentParticipant.findFirst({ where: { id: input.participantId, tournamentId } });
    if (!participant) throw new TournamentError("Registration not found.", 404);
    if (input.decision === "APPROVE" && participant.status !== "PENDING" && participant.status !== "APPROVED") throw new TournamentError("This registration cannot be approved in its current state.", 409);
    if (input.decision === "REJECT" && participant.status !== "PENDING") throw new TournamentError("Only pending registrations can be rejected.", 409);
    if (input.decision === "REMOVE" && !input.reason?.trim()) throw new TournamentError("Enter a reason when removing a participant.", 400);
    if (input.decision === "APPROVE") {
      const activeCount = await tx.tournamentParticipant.count({ where: { tournamentId, status: { in: ["PENDING", "APPROVED"] } } });
      const capacity = await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId }, select: { maxParticipants: true } });
      if (activeCount > capacity.maxParticipants) throw new TournamentError("This tournament is already at capacity.", 409);
    }
    if (input.seed !== undefined) {
      if (tournament.drawGeneratedAt) throw new TournamentError("Seeds are locked after the draw is generated.", 409);
      const conflicting = input.seed === null ? null : await tx.tournamentParticipant.findFirst({ where: { tournamentId, seed: input.seed, id: { not: participant.id } }, select: { id: true } });
      if (conflicting) throw new TournamentError("That seed is already assigned to another player.", 409);
    }
    if (input.decision === "REMOVE" && tournament.drawGeneratedAt) {
      await forfeitTournamentParticipant(tx, tournamentId, participant.userId, input.reason!.trim());
    }
    if (input.decision !== "APPROVE" || participant.status === "PENDING") {
      const name = (await tx.tournament.findUniqueOrThrow({ where: { id: tournamentId }, select: { name: true } })).name;
      const verb = input.decision === "APPROVE" ? "approved" : input.decision === "REJECT" ? "rejected" : "removed";
      await notifyUsers(tx, [participant.userId], {
        type: "TOURNAMENT_REGISTRATION_REVIEW",
        title: `Your registration for ${name} was ${verb}`,
        body: input.decision === "REMOVE" ? `Reason: ${input.reason!.trim()}` : null,
        link: `/tournaments/${tournamentId}`,
        dedupeKey: `registration-review:${participant.id}:${input.decision}`,
      });
    }
    return tx.tournamentParticipant.update({
      where: { id: participant.id },
      data: {
        ...(input.seed !== undefined ? { seed: input.seed } : {}),
        ...(input.decision === "APPROVE" ? { status: "APPROVED" } : {}),
        ...(input.decision === "REJECT" ? { status: "REJECTED" } : {}),
        ...(input.decision === "REMOVE" ? { status: "REMOVED", removedAt: new Date(), removedReason: input.reason!.trim() } : {}),
      },
    });
  });
}

export async function closeTournamentRegistration(userId: string, tournamentId: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  const tournament = await assertOrganizer(userId, tournamentId, prisma);
  if (tournament.status !== "OPEN_REGISTRATION") throw new TournamentError("Only open registrations can be closed.", 409);
  return prisma.$transaction(async (tx) => {
    const updated = await tx.tournament.update({ where: { id: tournamentId }, data: { status: "REGISTRATION_CLOSED" } });
    const participants = await tx.tournamentParticipant.findMany({ where: { tournamentId, status: { in: ["APPROVED", "PENDING"] } }, select: { userId: true } });
    await notifyUsers(tx, participants.map((participant) => participant.userId), { type: "TOURNAMENT_REGISTRATION_CLOSED", title: `Registration closed for ${updated.name}`, body: "The organizer will publish the draw soon.", link: `/tournaments/${tournamentId}`, dedupeKey: `registration-closed:${tournamentId}` });
    return updated;
  });
}

export async function generateTournamentDraw(userId: string, tournamentId: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  return prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.findUnique({
      where: { id: tournamentId },
      include: { participants: { where: { status: "APPROVED" }, orderBy: [{ seed: "asc" }, { registeredAt: "asc" }] } },
    });
    if (!tournament) throw new TournamentError("Tournament not found.", 404);
    const user = await tx.user.findUnique({ where: { id: userId }, select: { role: true } });
    if (tournament.createdById !== userId && !isAdminRole(user?.role)) throw new TournamentError("Only the organizer can generate this draw.", 403);
    const existingFixtures = await tx.tournamentFixture.count({ where: { tournamentId } });
    if (tournament.drawGeneratedAt || existingFixtures) throw new TournamentError("The draw has already been generated and cannot be replaced.", 409);
    if (tournament.status !== "REGISTRATION_CLOSED" && !(tournament.status === "OPEN_REGISTRATION" && tournament.registrationDeadline <= new Date())) {
      throw new TournamentError("Close registration before generating the draw.", 409);
    }
    if (tournament.participants.length < tournament.minParticipants) throw new TournamentError(`At least ${tournament.minParticipants} approved players are required.`, 409);
    const now = new Date();
    const drawStartAt = tournament.startDate > now ? tournament.startDate : now;
    if (drawStartAt > tournament.endDate) throw new TournamentError("The tournament end date has passed; update the tournament before generating fixtures.", 409);
    const entrants = tournament.participants.map(({ userId: playerId, seed }) => ({ playerId, seed }));
    const draw = tournament.format === "SINGLE_ELIMINATION"
      ? generateSingleEliminationDraw(entrants)
      : generateRoundRobinDraw(entrants);
    const roundIds = new Map<number, string>();
    for (const round of draw) {
      const saved = await tx.tournamentRound.create({ data: { tournamentId, number: round.number, label: round.label, status: round.number === 1 ? "IN_PROGRESS" : "PENDING" } });
      roundIds.set(round.number, saved.id);
    }
    const fixtures = [];
    for (const round of draw) {
      for (const fixture of round.fixtures) {
        const saved = await tx.tournamentFixture.create({
          data: {
            tournamentId,
            roundId: roundIds.get(fixture.roundNumber)!,
            position: fixture.position,
            player1Id: fixture.player1Id,
            player2Id: fixture.player2Id,
            winnerId: fixture.winnerId,
            scheduledAt: drawStartAt,
            status: fixture.status === "BYE" ? "BYE" : "PENDING",
            resultProcessedAt: fixture.status === "BYE" ? new Date() : null,
          },
        });
        fixtures.push({ fixture: saved, roundNumber: fixture.roundNumber });
      }
    }
    for (const row of fixtures) {
      const fixture = await tx.tournamentFixture.findUniqueOrThrow({ where: { id: row.fixture.id } });
      if (fixture.player1Id && fixture.player2Id) await createTournamentFixtureMatch(tx, tournament, fixture);
    }
    await tx.tournament.update({ where: { id: tournamentId }, data: { status: "IN_PROGRESS", drawGeneratedAt: new Date() } });
    await notifyUsers(tx, tournament.participants.map((participant) => participant.userId), { type: "TOURNAMENT_DRAW", title: `The draw for ${tournament.name} is out`, body: "Check your fixtures and match schedule.", link: `/tournaments/${tournamentId}`, dedupeKey: `draw:${tournamentId}` });
    return { rounds: draw.length, fixtures: fixtures.length };
  });
}

export async function scheduleTournamentFixture(userId: string, tournamentId: string, fixtureId: string, scheduledAt: Date) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  return prisma.$transaction(async (tx) => {
    await assertOrganizer(userId, tournamentId, tx);
    const fixture = await tx.tournamentFixture.findFirst({ where: { id: fixtureId, tournamentId }, include: { tournament: true, match: true } });
    if (!fixture) throw new TournamentError("Tournament fixture not found.", 404);
    if (Number.isNaN(scheduledAt.getTime()) || scheduledAt < fixture.tournament.startDate || scheduledAt > fixture.tournament.endDate) {
      throw new TournamentError("Schedule matches between the tournament start and end dates.", 400);
    }
    if (fixture.status === "COMPLETED" || fixture.status === "BYE" || fixture.status === "FORFEIT" || fixture.status === "CANCELLED") throw new TournamentError("This fixture can no longer be scheduled.", 409);
    if (!fixture.player1Id || !fixture.player2Id) throw new TournamentError("Both players must be determined before scheduling this match.", 409);
    if (fixture.match && fixture.match.status !== "ABANDONED" && fixture.match.status !== "CANCELLED") {
      if (fixture.match.status !== "SCHEDULED") throw new TournamentError("A match can only be rescheduled before it starts.", 409);
      await tx.match.update({ where: { id: fixture.match.id }, data: { scheduledAt } });
      await notifyScheduled(tx, fixture.tournament, [fixture.player1Id, fixture.player2Id], fixture.id, scheduledAt);
      return tx.tournamentFixture.update({ where: { id: fixtureId }, data: { scheduledAt, status: "SCHEDULED", version: { increment: 1 } } });
    }
    const requestId = `tournament:${tournamentId}:r${fixture.roundId}:f${fixture.position}:v${fixture.version + 1}`;
    const match = await tx.match.create({
      data: {
        requestId,
        createdById: fixture.tournament.createdById,
        player1Id: fixture.player1Id,
        player2Id: fixture.player2Id,
        matchType: "SINGLES",
        bestOf: fixture.tournament.bestOf,
        scheduledAt,
        location: fixture.tournament.location,
        notes: `Tournament match: ${fixture.tournament.name}`,
      },
    });
    await notifyScheduled(tx, fixture.tournament, [fixture.player1Id, fixture.player2Id], fixture.id, scheduledAt);
    return tx.tournamentFixture.update({ where: { id: fixtureId }, data: { matchId: match.id, scheduledAt, status: "SCHEDULED", version: { increment: 1 } } });
  });
}

function notifyScheduled(tx: Prisma.TransactionClient, tournament: { id: string; name: string }, players: string[], fixtureId: string, scheduledAt: Date) {
  return notifyUsers(tx, players, {
    type: "TOURNAMENT_MATCH_SCHEDULED",
    title: `Match scheduled in ${tournament.name}`,
    body: `Your match is scheduled for ${scheduledAt.toUTCString()}.`,
    link: `/tournaments/${tournament.id}`,
    dedupeKey: `schedule:${fixtureId}:${scheduledAt.toISOString()}`,
  });
}

export async function cancelTournament(userId: string, tournamentId: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  return prisma.$transaction(async (tx) => {
    const tournament = await assertOrganizer(userId, tournamentId, tx);
    if (tournament.status === "COMPLETED") throw new TournamentError("Completed tournaments cannot be cancelled.", 409);
    if (tournament.status === "CANCELLED") return { status: "CANCELLED" as const };
    const now = new Date();
    const fixtures = await tx.tournamentFixture.findMany({ where: { tournamentId, status: { in: ["PENDING", "SCHEDULED", "IN_PROGRESS"] } }, select: { id: true, matchId: true } });
    const matchIds = fixtures.flatMap((fixture) => fixture.matchId ? [fixture.matchId] : []);
    if (matchIds.length) await tx.match.updateMany({ where: { id: { in: matchIds }, status: { in: ["SCHEDULED", "IN_PROGRESS"] } }, data: { status: "ABANDONED", abandonedAt: now, version: { increment: 1 } } });
    await tx.tournamentFixture.updateMany({ where: { id: { in: fixtures.map((fixture) => fixture.id) } }, data: { status: TournamentFixtureStatus.CANCELLED, version: { increment: 1 } } });
    const cancelled = await tx.tournament.update({ where: { id: tournamentId }, data: { status: TournamentStatus.CANCELLED } });
    const participants = await tx.tournamentParticipant.findMany({ where: { tournamentId, status: { in: ["APPROVED", "PENDING"] } }, select: { userId: true } });
    await notifyUsers(tx, participants.map((participant) => participant.userId), { type: "TOURNAMENT_CANCELLED", title: `${cancelled.name} was cancelled`, link: `/tournaments/${tournamentId}`, dedupeKey: `cancelled:${tournamentId}` });
    return cancelled;
  });
}

export async function deleteDraftTournament(userId: string, tournamentId: string) {
  const prisma = getPrismaClient();
  if (!prisma) throw new TournamentError("Database unavailable.", 503);
  return prisma.$transaction(async (tx) => {
    const tournament = await assertOrganizer(userId, tournamentId, tx);
    const participants = await tx.tournamentParticipant.count({ where: { tournamentId } });
    const fixtures = await tx.tournamentFixture.count({ where: { tournamentId } });
    if (tournament.status !== "DRAFT" || participants || fixtures) throw new TournamentError("Only an empty draft tournament can be deleted. Cancel other tournaments instead.", 409);
    await tx.tournament.delete({ where: { id: tournamentId } });
    return { deleted: true };
  });
}
