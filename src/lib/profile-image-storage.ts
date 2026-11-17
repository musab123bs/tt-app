import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const localImagePrefix = "local:";
const imageDirectory = path.join(process.cwd(), "uploads", "profile-images");

const imageTypes = {
  "image/png": { extension: "png", contentType: "image/png" },
  "image/jpeg": { extension: "jpg", contentType: "image/jpeg" },
  "image/webp": { extension: "webp", contentType: "image/webp" },
} as const;

type SupportedImageType = keyof typeof imageTypes;

export function isSupportedImageType(type: string): type is SupportedImageType {
  return Object.hasOwn(imageTypes, type);
}

export async function storeLocalProfileImage(bytes: Buffer, type: SupportedImageType) {
  const { extension } = imageTypes[type];
  const fileName = `${randomUUID()}.${extension}`;

  await mkdir(imageDirectory, { recursive: true });
  await writeFile(path.join(imageDirectory, fileName), bytes, { flag: "wx" });

  return {
    publicId: `${localImagePrefix}${fileName}`,
    profileImage: `/api/profile/images/${fileName}`,
  };
}

export function isLocalProfileImage(publicId: string | null | undefined) {
  return Boolean(publicId?.startsWith(localImagePrefix));
}

function localImageFileName(publicId: string) {
  const fileName = publicId.slice(localImagePrefix.length);
  return /^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(fileName) ? fileName : null;
}

export async function deleteLocalProfileImage(publicId: string) {
  const fileName = localImageFileName(publicId);
  if (!fileName) return;

  try {
    await unlink(path.join(imageDirectory, fileName));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
  }
}

export async function readLocalProfileImage(fileName: string) {
  if (!/^[0-9a-f-]{36}\.(png|jpg|webp)$/i.test(fileName)) return null;

  const extension = path.extname(fileName).slice(1).toLowerCase();
  const contentType = extension === "jpg" ? "image/jpeg" : `image/${extension}`;

  try {
    return { bytes: await readFile(path.join(imageDirectory, fileName)), contentType };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw error;
  }
}
