import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { playerProfileSchema } from "@/lib/validators";
import { AccountRestrictedError, assertAccountActive } from "@/lib/services/account-status";
import { getPlatformSettings } from "@/lib/services/platform-settings";

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

  try {
    await assertAccountActive(session.user.id);
  } catch (error) {
    if (error instanceof AccountRestrictedError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const existingProfile = await prisma.playerProfile.findUnique({
    where: { userId: session.user.id },
  });

  // Platform settings decide which optional fields players may edit and which
  // levels are selectable; existing stored values are preserved, never cleared.
  const settings = await getPlatformSettings();
  const allowed = new Set<string>(settings.player.allowedProfileFields);
  if (parsed.data.level !== existingProfile?.level && !settings.player.levelOptions.includes(parsed.data.level)) {
    return NextResponse.json({ error: "That player level is not currently available." }, { status: 400 });
  }
  const keep = <K extends "bio" | "country" | "city" | "clubName" | "playingHand" | "playingStyle" | "dateOfBirth">(key: K) => !allowed.has(key);
  if (keep("bio")) parsed.data.bio = existingProfile?.bio ?? "";
  if (keep("country")) parsed.data.country = existingProfile?.country ?? "";
  if (keep("city")) parsed.data.city = existingProfile?.city ?? "";
  if (keep("clubName")) parsed.data.clubName = existingProfile?.clubName ?? "";
  if (keep("playingHand")) parsed.data.playingHand = existingProfile?.playingHand ?? null;
  if (keep("playingStyle")) parsed.data.playingStyle = existingProfile?.playingStyle ?? null;
  if (keep("dateOfBirth")) parsed.data.dateOfBirth = existingProfile?.dateOfBirth?.toISOString().slice(0, 10) ?? null;

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
