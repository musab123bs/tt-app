import { NextResponse } from "next/server";

import { AdminError } from "@/lib/admin/errors";
import { readAdminBody, withAdmin } from "@/lib/admin/route-helpers";
import { getTournamentAdminDetail, performTournamentAdminAction, tournamentAdminActionSchema } from "@/lib/services/admin/tournaments";

type Context = { params: Promise<{ tournamentId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return withAdmin(async () => {
    const tournament = await getTournamentAdminDetail((await params).tournamentId);
    if (!tournament) throw new AdminError("Tournament not found.", 404);
    return NextResponse.json({ tournament });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return withAdmin(async (admin) => {
    const body = await readAdminBody(request, tournamentAdminActionSchema, admin);
    if (body.response) return body.response;
    return NextResponse.json({ result: await performTournamentAdminAction(admin.id, (await params).tournamentId, body.data) });
  });
}
