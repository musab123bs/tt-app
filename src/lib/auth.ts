import { prismaAdapter } from "@better-auth/prisma-adapter";
import { betterAuth } from "better-auth";
import { nextCookies, toNextJsHandler } from "better-auth/next-js";

import { getPrismaClient } from "@/lib/prisma";

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
          await prisma.playerProfile.upsert({
            where: { userId: user.id },
            create: { userId: user.id, fullName: user.name, level: "BEGINNER" },
            update: {},
          });
        },
      },
    },
  },
  plugins: [nextCookies()],
});

export const authHandler = toNextJsHandler(auth);
