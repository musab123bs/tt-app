import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { playerProfileSchema } from "@/lib/validators";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  const profile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });

  return NextResponse.json({ profile });
}

async function saveProfile(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const prisma = getPrismaClient();

  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }
  const parsed = playerProfileSchema.safeParse(payload);

  if (!parsed.success) {
    return NextResponse.json(
      {
        error: parsed.error.issues[0]?.message ?? "Please check the form and try again.",
      },
      { status: 400 },
    );
  }

  const existingProfile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });

  const profile = await prisma.playerProfile.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      fullName: parsed.data.fullName,
      bio: parsed.data.bio || null,
      country: parsed.data.country || null,
      city: parsed.data.city || null,
      clubName: parsed.data.clubName || null,
      playingHand: parsed.data.playingHand ?? null,
      playingStyle: parsed.data.playingStyle ?? null,
      level: parsed.data.level,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      profileImage: existingProfile?.profileImage ?? null,
      publicId: existingProfile?.publicId ?? null,
      isPublic: parsed.data.isPublic ?? true,
    },
    update: {
      fullName: parsed.data.fullName,
      bio: parsed.data.bio || null,
      country: parsed.data.country || null,
      city: parsed.data.city || null,
      clubName: parsed.data.clubName || null,
      playingHand: parsed.data.playingHand ?? null,
      playingStyle: parsed.data.playingStyle ?? null,
      level: parsed.data.level,
      dateOfBirth: parsed.data.dateOfBirth ? new Date(parsed.data.dateOfBirth) : null,
      // Image URLs are only written by the authenticated upload endpoint.
      // Never trust browser supplied URLs or Cloudinary public IDs here.
      profileImage: existingProfile?.profileImage ?? null,
      publicId: existingProfile?.publicId ?? null,
      isPublic: parsed.data.isPublic ?? existingProfile?.isPublic ?? true,
    },
  });

  return NextResponse.json({ profile });
}

// Support both POST (form submit) and PATCH (REST convention per phase2 spec)
export const POST = saveProfile;
export const PATCH = saveProfile;
