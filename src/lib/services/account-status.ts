import "server-only";

import type { Prisma, PrismaClient } from "@/generated/prisma";
import { getPrismaClient } from "@/lib/prisma";

export class AccountRestrictedError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "AccountRestrictedError";
  }
}

type Db = PrismaClient | Prisma.TransactionClient;

export function getEffectiveAccountStatus(user: { status: string; suspendedUntil: Date | null }, now = new Date()) {
  if (user.status === "SUSPENDED" && user.suspendedUntil && user.suspendedUntil <= now) return "ACTIVE";
  return user.status;
}

/** Throws when the account may not perform protected actions. Expired suspensions are lifted lazily. */
export async function assertAccountActive(userId: string, db?: Db) {
  const client = db ?? getPrismaClient();
  if (!client) throw new Error("Database unavailable.");
  const user = await client.user.findUnique({ where: { id: userId }, select: { status: true, suspendedUntil: true } });
  if (!user) throw new AccountRestrictedError("Account not found.");
  const status = getEffectiveAccountStatus(user);
  if (status === "ACTIVE") {
    if (user.status === "SUSPENDED") await client.user.update({ where: { id: userId }, data: { status: "ACTIVE", suspendedUntil: null, suspensionReason: null } });
    return;
  }
  if (status === "SUSPENDED") {
    throw new AccountRestrictedError(user.suspendedUntil ? `Your account is suspended until ${user.suspendedUntil.toUTCString()}.` : "Your account is suspended.");
  }
  if (status === "RESTRICTED") throw new AccountRestrictedError("Your account is restricted. Contact support for help.");
  throw new AccountRestrictedError("This account is no longer active.");
}
