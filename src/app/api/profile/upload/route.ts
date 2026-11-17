import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { AccountRestrictedError, assertAccountActive } from "@/lib/services/account-status";
import { v2 as cloudinary } from "cloudinary";

import { auth } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import {
  deleteLocalProfileImage,
  isLocalProfileImage,
  isSupportedImageType,
  storeLocalProfileImage,
} from "@/lib/profile-image-storage";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await assertAccountActive(session.user.id);
  } catch (error) {
    if (error instanceof AccountRestrictedError) return NextResponse.json({ error: error.message }, { status: 403 });
    throw error;
  }

  const useLocalStorage = process.env.NODE_ENV !== "production";
  const cloudinaryConfigured = Boolean(
    process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET,
  );

  if (!useLocalStorage && !cloudinaryConfigured) {
    return NextResponse.json({ error: "Cloudinary is not configured for uploads." }, { status: 400 });
  }

  const formData = await request.formData();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "A valid image file is required." }, { status: 400 });
  }

  if (!isSupportedImageType(file.type)) {
    return NextResponse.json({ error: "Upload a PNG, JPEG, or WebP image." }, { status: 400 });
  }

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: "Image size must be 5MB or less." }, { status: 400 });
  }

  const prisma = getPrismaClient();
  if (!prisma) {
    return NextResponse.json({ error: "Database unavailable" }, { status: 503 });
  }

  let storedLocalPublicId: string | null = null;

  try {
    const fileBytes = Buffer.from(await file.arrayBuffer());
    const isPng = fileBytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    const isJpeg = fileBytes[0] === 0xff && fileBytes[1] === 0xd8 && fileBytes[2] === 0xff;
    const isWebp = fileBytes.toString("ascii", 0, 4) === "RIFF" && fileBytes.toString("ascii", 8, 12) === "WEBP";
    if (!(isPng || isJpeg || isWebp)) {
      return NextResponse.json({ error: "The uploaded file is not a valid PNG, JPEG, or WebP image." }, { status: 400 });
    }

    const existing = await prisma.playerProfile.findUnique({ where: { userId: session.user.id } });

    const uploadResult = useLocalStorage
      ? await storeLocalProfileImage(fileBytes, file.type)
      : await new Promise<{ profileImage: string; publicId: string }>((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            {
              folder: "table-tennis-analytics/profiles",
              resource_type: "image",
              transformation: [{ quality: "auto" }, { fetch_format: "auto" }],
            },
            (error, result) => {
              if (error || !result) {
                reject(error ?? new Error("Image upload failed."));
                return;
              }

              resolve({ profileImage: result.secure_url, publicId: result.public_id });
            },
          );

          uploadStream.end(fileBytes);
        });

    if (isLocalProfileImage(uploadResult.publicId)) {
      storedLocalPublicId = uploadResult.publicId;
    }

    const profile = await prisma.playerProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        fullName: session.user.name ?? "Player",
        level: "BEGINNER",
        profileImage: uploadResult.profileImage,
        publicId: uploadResult.publicId,
      },
      update: {
        profileImage: uploadResult.profileImage,
        publicId: uploadResult.publicId,
      },
    });

    if (existing?.publicId && existing.publicId !== profile.publicId) {
      if (isLocalProfileImage(existing.publicId)) {
        await deleteLocalProfileImage(existing.publicId).catch(() => undefined);
      } else if (!useLocalStorage) {
        await cloudinary.uploader.destroy(existing.publicId, { resource_type: "image" }).catch(() => undefined);
      }
    }

    return NextResponse.json({ profileImage: profile.profileImage, publicId: profile.publicId });
  } catch (error) {
    if (storedLocalPublicId) {
      await deleteLocalProfileImage(storedLocalPublicId).catch(() => undefined);
    }
    const message = error instanceof Error ? error.message : "Image upload failed.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const prisma = getPrismaClient();
  if (!prisma) return NextResponse.json({ error: "Database unavailable" }, { status: 503 });

  try {
    const profile = await prisma.playerProfile.findUnique({ where: { userId: session.user.id } });
    await prisma.playerProfile.updateMany({
      where: { userId: session.user.id },
      data: { profileImage: null, publicId: null },
    });

    if (profile?.publicId && isLocalProfileImage(profile.publicId)) {
      await deleteLocalProfileImage(profile.publicId).catch(() => undefined);
    } else if (
      profile?.publicId &&
      process.env.NODE_ENV === "production" &&
      process.env.CLOUDINARY_CLOUD_NAME &&
      process.env.CLOUDINARY_API_KEY &&
      process.env.CLOUDINARY_API_SECRET
    ) {
      await cloudinary.uploader.destroy(profile.publicId, { resource_type: "image" }).catch(() => undefined);
    }
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Unable to remove profile image." }, { status: 500 });
  }
}
