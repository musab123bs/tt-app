import { NextResponse } from "next/server";
import { getCurrentSession } from "@/lib/session";
import { scheduleTournamentFixture, TournamentError } from "@/lib/services/tournaments";
import { scheduleFixtureSchema } from "@/lib/tournaments/validation";

type Context = { params: Promise<{ tournamentId: string; fixtureId: string }> };

export async function PATCH(request: Request, { params }: Context) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request body." }, { status: 400 }); }
  const parsed = scheduleFixtureSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Choose a valid date and time." }, { status: 400 });
  const { tournamentId, fixtureId } = await params;
  try {
    const fixture = await scheduleTournamentFixture(session.user.id, tournamentId, fixtureId, new Date(parsed.data.scheduledAt));
    return NextResponse.json({ fixture: { id: fixture.id, scheduledAt: fixture.scheduledAt?.toISOString() ?? null, status: fixture.status } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to schedule match." }, { status: error instanceof TournamentError ? error.status : 500 });
  }
}
