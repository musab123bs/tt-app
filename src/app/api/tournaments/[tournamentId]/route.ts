import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { getTournamentDetail, updateTournament, TournamentError } from "@/lib/services/tournaments";
import { tournamentUpdateSchema } from "@/lib/tournaments/validation";

type Context = { params: Promise<{ tournamentId: string }> };
export async function GET(_request: Request, { params }: Context) {
  const session = await getCurrentSession();
  try { const { tournamentId } = await params; const tournament = await getTournamentDetail(tournamentId, session?.user.id); return tournament ? NextResponse.json({ tournament }) : NextResponse.json({ error: "Tournament not found." }, { status: 404 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to load tournament." }, { status: error instanceof TournamentError ? error.status : 500 }); }
}
export async function PATCH(request: Request, { params }: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = tournamentUpdateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check tournament details." }, { status: 400 });
  const { tournamentId } = await params;
  try { return NextResponse.json({ tournament: await updateTournament(session.user.id, tournamentId, parsed.data) }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update tournament." }, { status: error instanceof TournamentError ? error.status : 500 }); }
}
