import { NextResponse } from "next/server";

import { adminErrorResponse } from "@/lib/admin/errors";
import { checkRateLimit } from "@/lib/rate-limit";
import { getCurrentSession } from "@/lib/session";
import { createReport, listMyReports, reportCreateSchema } from "@/lib/services/reports";

export async function GET() {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try { return NextResponse.json({ reports: await listMyReports(session.user.id) }); }
  catch (error) { return adminErrorResponse(error, "Unable to load your reports."); }
}

export async function POST(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const limit = checkRateLimit(`report:${session.user.id}`, 5, 10 * 60_000);
  if (!limit.allowed) return NextResponse.json({ error: "You have submitted several reports recently. Please wait before sending another." }, { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 }); }
  const parsed = reportCreateSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Check the report details." }, { status: 400 });
  try { return NextResponse.json({ report: await createReport(session.user.id, parsed.data) }, { status: 201 }); }
  catch (error) { return adminErrorResponse(error, "Unable to submit report."); }
}
