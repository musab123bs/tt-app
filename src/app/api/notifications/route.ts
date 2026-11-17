import { NextResponse } from "next/server";
import { z } from "zod";

import { getCurrentSession } from "@/lib/session";
import { getUserNotifications, markNotificationsRead } from "@/lib/services/notifications";

const markReadSchema = z.object({ ids: z.array(z.string().min(1)).max(100).optional() });

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    return NextResponse.json(await getUserNotifications(session.user.id));
  } catch {
    return NextResponse.json({ error: "Unable to load notifications." }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown = {};
  try { body = await request.json(); } catch { body = {}; }
  const parsed = markReadSchema.safeParse(body ?? {});
  if (!parsed.success) return NextResponse.json({ error: "Choose valid notifications." }, { status: 400 });
  try {
    return NextResponse.json({ updated: await markNotificationsRead(session.user.id, parsed.data.ids) });
  } catch {
    return NextResponse.json({ error: "Unable to update notifications." }, { status: 500 });
  }
}
