import { NextResponse } from "next/server";

import { getPrismaClient } from "@/lib/prisma";
import { getCurrentSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getCurrentSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2) return NextResponse.json({ players: [] });
  if (query.length > 80) return NextResponse.json({ error: "Search text is too long." }, { status: 400 });
  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  const players = await prisma.user.findMany({
    where: {
      role: "PLAYER",
      playerProfile: { is: { isPublic: true } },
      OR: [
        { name: { contains: query, mode: "insensitive" } },
        { playerProfile: { is: { fullName: { contains: query, mode: "insensitive" } } } },
      ],
    },
    select: {
      id: true, name: true, image: true,
      playerProfile: { select: { fullName: true, profileImage: true, level: true } },
    },
    orderBy: { name: "asc" },
    take: 20,
  });
  return NextResponse.json({ players: players.map((player) => ({
    id: player.id,
    name: player.playerProfile?.fullName?.trim() || player.name,
    image: player.playerProfile?.profileImage || player.image,
    level: player.playerProfile?.level ?? null,
  })) });
}
