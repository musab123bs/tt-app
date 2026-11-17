import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma";

export class AdminError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
    this.name = "AdminError";
  }
}

export function adminErrorResponse(error: unknown, fallback = "Unable to complete this administrative action.") {
  if (error instanceof AdminError) return NextResponse.json({ error: error.message }, { status: error.status });
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") return NextResponse.json({ error: "Record not found." }, { status: 404 });
  if (error instanceof Error && error.name === "TournamentError" && "status" in error) return NextResponse.json({ error: error.message }, { status: Number(error.status) });
  console.error("[admin]", error);
  return NextResponse.json({ error: fallback }, { status: 500 });
}
