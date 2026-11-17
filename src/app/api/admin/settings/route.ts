import { NextResponse } from "next/server";

import { readAdminBody, withAdmin } from "@/lib/admin/route-helpers";
import { getPrismaClient } from "@/lib/prisma";
import { recordAudit } from "@/lib/services/audit-log";
import { getPlatformSettings, platformSettingsSchema, savePlatformSettings } from "@/lib/services/platform-settings";

export async function GET() {
  return withAdmin(async () => NextResponse.json({ settings: await getPlatformSettings() }));
}

export async function PUT(request: Request) {
  return withAdmin(async (admin) => {
    const body = await readAdminBody(request, platformSettingsSchema, admin);
    if (body.response) return body.response;
    const prisma = getPrismaClient();
    if (!prisma) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
    const settings = await prisma.$transaction(async (tx) => {
      const previous = await getPlatformSettings(tx);
      await savePlatformSettings(tx, body.data);
      await recordAudit(tx, { adminId: admin.id, action: "SETTINGS_UPDATED", targetType: "PlatformSettings", targetId: "platform", previousValue: previous, newValue: body.data });
      return body.data;
    });
    return NextResponse.json({ settings });
  });
}
