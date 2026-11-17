import { NextResponse } from "next/server";

import { parsePage } from "@/lib/admin/pagination";
import { searchParam, withAdmin } from "@/lib/admin/route-helpers";
import { listTournamentsForAdmin } from "@/lib/services/admin/tournaments";

export async function GET(request: Request) {
  return withAdmin(async () => NextResponse.json(await listTournamentsForAdmin({ q: searchParam(request, "q"), status: searchParam(request, "status"), format: searchParam(request, "format"), page: parsePage(searchParam(request, "page")) })));
}
