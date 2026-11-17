import { NextResponse } from "next/server";

import { AdminError } from "@/lib/admin/errors";
import { readAdminBody, withAdmin } from "@/lib/admin/route-helpers";
import { getMatchAdminDetail, matchActionSchema, performMatchAction } from "@/lib/services/admin/matches";

type Context = { params: Promise<{ matchId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return withAdmin(async () => {
    const match = await getMatchAdminDetail((await params).matchId);
    if (!match) throw new AdminError("Match not found.", 404);
    return NextResponse.json({ match });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return withAdmin(async (admin) => {
    const body = await readAdminBody(request, matchActionSchema, admin);
    if (body.response) return body.response;
    return NextResponse.json({ result: await performMatchAction(admin.id, (await params).matchId, body.data) });
  });
}
