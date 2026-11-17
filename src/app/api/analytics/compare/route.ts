import { NextResponse } from "next/server";

import { getHeadToHeadAnalytics } from "@/lib/services/analytics";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const playerAId = params.get("playerA") || session.user.id;
  const playerBId = params.get("playerB") || "";
  if (!playerBId || playerBId === playerAId) {
    return NextResponse.json({ error: "Choose two different players to compare." }, { status: 400 });
  }
  const comparison = await getHeadToHeadAnalytics(playerAId, playerBId, session.user.id);
  if (!comparison) return NextResponse.json({ error: "Player not found or their profile is private." }, { status: 404 });
  return NextResponse.json({ comparison });
}
