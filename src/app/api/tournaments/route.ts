import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { createTournament, getTournaments, TournamentError } from "@/lib/services/tournaments";
import { tournamentCreateSchema } from "@/lib/tournaments/validation";

export async function GET() {
  const session = await getCurrentSession();
  try { return NextResponse.json({ tournaments: await getTournaments({ userId: session?.user.id }) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load tournaments." }, { status: error instanceof TournamentError ? error.status : 500 }); }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = tournamentCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check tournament details." }, { status: 400 });
  try { return NextResponse.json({ tournament: await createTournament(session.user.id, parsed.data) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Could not create tournament." }, { status: error instanceof TournamentError ? error.status : 500 }); }
}
