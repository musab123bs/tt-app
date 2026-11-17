import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";

import { MatchCommandError } from "@/lib/services/match-commands";

export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new MatchCommandError("Request body must be valid JSON.", 400);
  }
}

export function matchErrorResponse(error: unknown) {
  if (error instanceof MatchCommandError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
    return NextResponse.json({ error: "This action was already submitted." }, { status: 409 });
  }

  return NextResponse.json({ error: "Unable to process this match request." }, { status: 500 });
}
