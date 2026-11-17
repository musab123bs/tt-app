import { NextResponse } from "next/server";

import { parsePage } from "@/lib/admin/pagination";
import { searchParam, withAdmin } from "@/lib/admin/route-helpers";
import { listPlayers } from "@/lib/services/admin/players";

export async function GET(request: Request) {
  return withAdmin(async () => NextResponse.json(await listPlayers({ q: searchParam(request, "q"), level: searchParam(request, "level"), page: parsePage(searchParam(request, "page")) })));
}
