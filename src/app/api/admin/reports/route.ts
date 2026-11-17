import { NextResponse } from "next/server";

import { parsePage } from "@/lib/admin/pagination";
import { searchParam, withAdmin } from "@/lib/admin/route-helpers";
import { listReports } from "@/lib/services/reports";

export async function GET(request: Request) {
  return withAdmin(async () => NextResponse.json(await listReports({ status: searchParam(request, "status"), type: searchParam(request, "type"), page: parsePage(searchParam(request, "page")) })));
}
