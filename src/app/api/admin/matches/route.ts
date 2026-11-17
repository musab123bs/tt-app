import { NextResponse } from "next/server";

import { parsePage } from "@/lib/admin/pagination";
import { searchParam, withAdmin } from "@/lib/admin/route-helpers";
import { listMatches } from "@/lib/services/admin/matches";

export async function GET(request: Request) {
  return withAdmin(async () => NextResponse.json(await listMatches({ q: searchParam(request, "q"), status: searchParam(request, "status"), from: searchParam(request, "from"), to: searchParam(request, "to"), review: searchParam(request, "review"), page: parsePage(searchParam(request, "page")) })));
}
