import { NextResponse } from "next/server";

import { parsePage } from "@/lib/admin/pagination";
import { searchParam, withAdmin } from "@/lib/admin/route-helpers";
import { listAuditLogs } from "@/lib/services/admin/overview";

export async function GET(request: Request) {
  return withAdmin(async () => NextResponse.json(await listAuditLogs({ action: searchParam(request, "action"), targetType: searchParam(request, "targetType"), q: searchParam(request, "q"), page: parsePage(searchParam(request, "page")) })));
}
