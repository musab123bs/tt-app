import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";

import { matchCommandSchema } from "@/lib/matches/validation";
import { matchErrorResponse, readJson } from "@/lib/matches/api";
import { getCurrentSession } from "@/lib/session";
import {
  MatchCommandError,
  performMatchCommand,
  recoverDuplicateCommand,
} from "@/lib/services/match-commands";

export async function POST(
  request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let payload: unknown;
  try {
    payload = await readJson(request);
  } catch (error) {
    return matchErrorResponse(error);
  }
  const parsed = matchCommandSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Check the scoring action and try again." },
      { status: 400 },
    );
  }

  const { matchId } = await context.params;
  try {
    const match = await performMatchCommand({
      userId: session.user.id,
      matchId,
      requestId: parsed.data.requestId,
      action: parsed.data.action,
      playerId: parsed.data.playerId,
    });
    return NextResponse.json({ match });
  } catch (error) {
    if (
      (error instanceof MatchCommandError && error.status === 409) ||
      (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
    ) {
      const existing = await recoverDuplicateCommand(session.user.id, matchId, parsed.data.requestId);
      if (existing) return NextResponse.json({ match: existing });
    }
    return matchErrorResponse(error);
  }
}
