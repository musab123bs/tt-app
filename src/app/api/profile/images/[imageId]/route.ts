import { headers } from "next/headers";
import { NextResponse } from "next/server";

import { auth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { readLocalProfileImage } from "@/lib/profile-image-storage";

export async function GET(
  _request: Request,
  context: { params: Promise<{ imageId: string }> },
) {
  const { imageId } = await context.params;
  const image = await readLocalProfileImage(imageId);

  if (!image) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable." }, { status: 503 });
  }

  const imageUrl = `/api/profile/images/${imageId}`;
  const profile = await prisma.playerProfile.findFirst({
    where: { profileImage: imageUrl },
    select: { userId: true, isPublic: true },
  });

  if (!profile) {
    return NextResponse.json({ error: "Image not found." }, { status: 404 });
  }

  if (!profile.isPublic) {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session?.user.id !== profile.userId) {
      return NextResponse.json({ error: "Image not found." }, { status: 404 });
    }
  }

  return new Response(new Uint8Array(image.bytes), {
    headers: {
      "Cache-Control": profile.isPublic ? "public, max-age=31536000, immutable" : "private, no-store",
      "Content-Type": image.contentType,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
