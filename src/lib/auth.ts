import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";

import { APIError } from "better-auth/api";

import { getPrismaClient } from "@/lib/prisma";
import { notifySuperAdmins } from "@/lib/services/admin/notify";
import { getPlatformSettings } from "@/lib/services/platform-settings";

const prisma = getPrismaClient();

if (!prisma) {
  throw new Error(
    "DATABASE_URL is not configured. Set it in your .env file before starting the server."
  );
}

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
    minPasswordLength: 8,
    maxPasswordLength: 72,
  },
  user: {
    additionalFields: {
      role: {
        type: "string",
        required: false,
        input: false,
        defaultValue: "PLAYER",
      },
    },
  },
  databaseHooks: {
    user: {
      create: {
        // The dashboard and profile API assume that every registered account
        // has a player profile. Create it as part of Better Auth's account
        // creation lifecycle, with ownership derived from the new user.
        after: async (user) => {
          const settings = await getPlatformSettings();
          await prisma.playerProfile.upsert({
            where: { userId: user.id },
            create: { userId: user.id, fullName: user.name, level: settings.player.levelOptions[0] ?? "BEGINNER", isPublic: settings.player.profilesPublicByDefault },
            update: {},
          });
          await notifySuperAdmins(prisma, { type: "ADMIN_NEW_USER", title: `New user registered: ${user.name}`, body: user.email, link: `/admin/users/${user.id}`, dedupeKey: `new-user:${user.id}` });
        },
      },
    },
    session: {
      create: {
        before: async (session) => {
          const account = await prisma.user.findUnique({ where: { id: session.userId }, select: { status: true } });
          if (!account || account.status === "DELETED") {
            throw new APIError("FORBIDDEN", { message: "This account is no longer active." });
          }
          return { data: session };
        },
        after: async (session) => {
          await prisma.user.update({ where: { id: session.userId }, data: { lastActiveAt: new Date() } });
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export const authHandler = toNextJsHandler(auth);
