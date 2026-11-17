import { NextResponse } from "next/server";

import { AdminError } from "@/lib/admin/errors";
import { readAdminBody, withAdmin } from "@/lib/admin/route-helpers";
import { correctPlayerProfile, getPlayerAdminDetail, profileCorrectionSchema } from "@/lib/services/admin/players";

type Context = { params: Promise<{ playerId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return withAdmin(async () => {
    const player = await getPlayerAdminDetail((await params).playerId);
    if (!player) throw new AdminError("Player not found.", 404);
    return NextResponse.json({ player });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return withAdmin(async (admin) => {
    const body = await readAdminBody(request, profileCorrectionSchema, admin);
    if (body.response) return body.response;
    return NextResponse.json({ profile: await correctPlayerProfile(admin.id, (await params).playerId, body.data) });
  });
}
