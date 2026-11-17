import { NextResponse } from "next/server";

import { getCurrentSession } from "@/lib/session";
import { getAccessibleMatch } from "@/lib/services/matches";
import { matchErrorResponse } from "@/lib/matches/api";

export async function GET(
  _request: Request,
  context: { params: Promise<{ matchId: string }> },
) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { matchId } = await context.params;
  try {
    const match = await getAccessibleMatch(session.user.id, matchId);
    if (!match) return NextResponse.json({ error: "Match not found." }, { status: 404 });
    return NextResponse.json({ match });
  } catch (error) {
    return matchErrorResponse(error);
  }
}
