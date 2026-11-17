import { NextResponse } from "next/server";
import { connection } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { healthResponseSchema } from "@/lib/validations/health";

export async function GET() {
  // This check must run against the live database when requested, never as a
  // build-time snapshot (the catch below intentionally handles DB outages).
  await connection();
  const prisma = getPrismaClient();

  if (!prisma) {
    return NextResponse.json(
      healthResponseSchema.parse({
        success: false,
        message: "Database unavailable",
      }),
      { status: 503 },
    );
  }

  try {
    await prisma.$queryRaw`SELECT 1`;

    const payload = healthResponseSchema.parse({
      success: true,
      message: "Table Tennis API is running",
    });

    return NextResponse.json(payload, { status: 200 });
  } catch {
    return NextResponse.json(
      healthResponseSchema.parse({
        success: false,
        message: "Database unavailable",
      }),
      { status: 503 },
    );
  }
}
