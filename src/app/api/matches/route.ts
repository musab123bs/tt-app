import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";

import { matchCreationSchema, matchFilterSchema } from "@/lib/matches/validation";
import { matchErrorResponse, readJson } from "@/lib/matches/api";
import { getCurrentSession } from "@/lib/session";
import { getAccessibleMatch, getPlayerMatchList } from "@/lib/services/matches";
import { getPrismaClient } from "@/lib/prisma";
import { AccountRestrictedError, assertAccountActive } from "@/lib/services/account-status";
import { getPlatformSettings } from "@/lib/services/platform-settings";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const filterValue = new URL(request.url).searchParams.get("filter") ?? "all";
  const parsedFilter = matchFilterSchema.safeParse(filterValue);
  if (!parsedFilter.success) {
    return NextResponse.json({ error: "Choose a valid match filter." }, { status: 400 });
  }

  try {
    const matches = await getPlayerMatchList(session.user.id, parsedFilter.data);
    return NextResponse.json({ matches });
  } catch (error) {
    return matchErrorResponse(error);
  }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await readJson(request);
  } catch (error) {
    return matchErrorResponse(error);
  }

  const parsed = matchCreationSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the match details and try again." },
      { status: 400 },
    );
  }

  if (parsed.data.opponentId === session.user.id) {
    return NextResponse.json({ error: "You cannot create a match against yourself." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });

  try {
    const existing = await prisma.match.findUnique({
      where: { requestId: parsed.data.requestId },
      select: { id: true, createdById: true },
    });
    if (existing) {
      if (existing.createdById !== session.user.id) {
        return NextResponse.json({ error: "This match request key is already in use." }, { status: 409 });
      }
      const match = await getAccessibleMatch(session.user.id, existing.id);
      return NextResponse.json({ match }, { status: 200 });
    }

    const opponent = await prisma.user.findUnique({
      where: { id: parsed.data.opponentId },
      select: { id: true, role: true, playerProfile: { select: { isPublic: true } } },
    });
    if (!opponent || opponent.role !== "PLAYER" || !opponent.playerProfile?.isPublic) {
      return NextResponse.json({ error: "Choose an available registered player." }, { status: 400 });
    }

    try {
      await assertAccountActive(session.user.id);
    } catch (error) {
      if (error instanceof AccountRestrictedError) return NextResponse.json({ error: error.message }, { status: 403 });
      throw error;
    }
    const settings = await getPlatformSettings();
    if (!settings.match.availableBestOf.includes(parsed.data.bestOf)) {
      return NextResponse.json({ error: `Best of ${parsed.data.bestOf} matches are not currently available.` }, { status: 400 });
    }

    const created = await prisma.match.create({
      data: {
        requestId: parsed.data.requestId,
        createdById: session.user.id,
        player1Id: session.user.id,
        player2Id: opponent.id,
        matchType: parsed.data.matchType,
        bestOf: parsed.data.bestOf,
        scheduledAt: new Date(parsed.data.scheduledAt),
        location: parsed.data.location || null,
        notes: parsed.data.notes || null,
      },
      select: { id: true },
    });

    const match = await getAccessibleMatch(session.user.id, created.id);
    return NextResponse.json({ match }, { status: 201 });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      const existing = await prisma.match.findUnique({
        where: { requestId: parsed.data.requestId },
        select: { id: true, createdById: true },
      });
      if (existing?.createdById === session.user.id) {
        const match = await getAccessibleMatch(session.user.id, existing.id);
        return NextResponse.json({ match }, { status: 200 });
      }
    }
    return matchErrorResponse(error);
  }
}
