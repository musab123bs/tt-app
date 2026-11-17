import { NextResponse } from "next/server";

import { AdminError } from "@/lib/admin/errors";
import { readAdminBody, withAdmin } from "@/lib/admin/route-helpers";
import { getReportDetail, reportUpdateSchema, updateReport } from "@/lib/services/reports";

type Context = { params: Promise<{ reportId: string }> };

export async function GET(_request: Request, { params }: Context) {
  return withAdmin(async () => {
    const report = await getReportDetail((await params).reportId);
    if (!report) throw new AdminError("Report not found.", 404);
    return NextResponse.json({ report });
  });
}

export async function PATCH(request: Request, { params }: Context) {
  return withAdmin(async (admin) => {
    const body = await readAdminBody(request, reportUpdateSchema, admin);
    if (body.response) return body.response;
    return NextResponse.json({ result: await updateReport(admin.id, (await params).reportId, body.data) });
  });
}
