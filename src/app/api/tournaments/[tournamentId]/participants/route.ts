import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { cancelOwnRegistration, closeTournamentRegistration, registerForTournament, reviewTournamentRegistration, TournamentError } from "@/lib/services/tournaments";
import { registrationReviewSchema } from "@/lib/tournaments/validation";

type Context = { params: Promise<{ tournamentId: string }> };
export async function POST(request: Request, { params }: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { tournamentId } = await params;
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  try {
    if (typeof body === "object" && body !== null && "action" in body && body.action === "REGISTER") return NextResponse.json({ participant: await registerForTournament(session.user.id, tournamentId) }, { status: 201 });
    if (typeof body === "object" && body !== null && "action" in body && body.action === "WITHDRAW") return NextResponse.json({ participant: await cancelOwnRegistration(session.user.id, tournamentId) });
    if (typeof body === "object" && body !== null && "action" in body && body.action === "CLOSE_REGISTRATION") return NextResponse.json({ tournament: await closeTournamentRegistration(session.user.id, tournamentId) });
    const parsed = registrationReviewSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Choose a valid registration action." }, { status: 400 });
    return NextResponse.json({ participant: await reviewTournamentRegistration(session.user.id, tournamentId, parsed.data) });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to update registration." }, { status: error instanceof TournamentError ? error.status : 500 });
  }
}
