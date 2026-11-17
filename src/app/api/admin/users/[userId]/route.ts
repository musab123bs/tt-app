import { NextResponse } from "next/server";

import { AdminError } from "@/lib/admin/errors";
import { readAdminBody, withAdmin } from "@/lib/admin/route-helpers";
import { getUserAdminDetail, performUserAction, userActionSchema } from "@/lib/services/admin/users";

type Context = { params: Promise<{ userId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return withAdmin(async () => {
    const user = await getUserAdminDetail((await params).userId);
    if (!user) throw new AdminError("User not found.", 404);
    return NextResponse.json({ user });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return withAdmin(async (admin) => {
    const body = await readAdminBody(request, userActionSchema, admin);
    if (body.response) return body.response;
    return NextResponse.json({ result: await performUserAction(admin.id, (await params).userId, body.data) });
  });
}
