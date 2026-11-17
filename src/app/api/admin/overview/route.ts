import { NextResponse } from "next/server";

import { withAdmin } from "@/lib/admin/route-helpers";
import { getAdminOverview } from "@/lib/services/admin/overview";

export async function GET() {
  return withAdmin(async () => NextResponse.json(await getAdminOverview()));
}
