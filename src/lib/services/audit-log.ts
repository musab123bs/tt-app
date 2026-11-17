import "server-only";

import type { AdminAuditAction, Prisma } from "@/generated/prisma";

const SENSITIVE_KEYS = /password|token|secret|session|accessToken|refreshToken|idToken/i;

function scrub(value: unknown): Prisma.InputJsonValue | undefined {
  if (value === undefined || value === null) return undefined;
  return JSON.parse(JSON.stringify(value, (key, nested) => (key && SENSITIVE_KEYS.test(key) ? "[redacted]" : nested)));
}

export async function recordAudit(tx: Prisma.TransactionClient, entry: {
  adminId: string;
  action: AdminAuditAction;
  targetType: string;
  targetId: string;
  previousValue?: unknown;
  newValue?: unknown;
  reason?: string | null;
}) {
  return tx.adminAuditLog.create({
    data: {
      adminId: entry.adminId,
      action: entry.action,
      targetType: entry.targetType,
      targetId: entry.targetId,
      previousValue: scrub(entry.previousValue),
      newValue: scrub(entry.newValue),
      reason: entry.reason?.trim() || null,
    },
  });
}
