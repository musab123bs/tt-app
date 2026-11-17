import { NextResponse } from "next/server";

import { parsePage } from "@/lib/admin/pagination";
import { searchParam, withAdmin } from "@/lib/admin/route-helpers";
import { listUsers } from "@/lib/services/admin/users";

export async function GET(request: Request) {
  return withAdmin(async () => NextResponse.json(await listUsers({ q: searchParam(request, "q"), role: searchParam(request, "role"), status: searchParam(request, "status"), page: parsePage(searchParam(request, "page")) })));
}
