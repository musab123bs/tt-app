import { NextResponse } from "next/server";

import { matchErrorResponse, readJson } from "@/lib/matches/api";
import { requestIdSchema } from "@/lib/matches/validation";
import { getCurrentSession } from "@/lib/session";
import { performMatchCommand } from "@/lib/services/match-commands";

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
  const parsed = requestIdSchema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "A valid request ID is required." }, { status: 400 });

  const { matchId } = await context.params;
  try {
    const match = await performMatchCommand({
      userId: session.user.id,
      matchId,
      requestId: parsed.data.requestId,
      action: "start",
    });
    return NextResponse.json({ match });
  } catch (error) {
    return matchErrorResponse(error);
  }
}
