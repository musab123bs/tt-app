import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { generateTournamentDraw, TournamentError } from "@/lib/services/tournaments";

type Context = { params: Promise<{ tournamentId: string }> };
export async function POST(_request: Request, { params }: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { const { tournamentId } = await params; return NextResponse.json(await generateTournamentDraw(session.user.id, tournamentId), { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to generate draw." }, { status: error instanceof TournamentError ? error.status : 500 }); }
}
