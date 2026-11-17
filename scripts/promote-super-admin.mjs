// Usage: npm run admin:promote -- user@example.com
// Grants SUPER_ADMIN to an existing account and marks it as a protected system
// account. Run on the server; the admin panel can never self-assign this role.
import { PrismaClient } from "../src/generated/prisma/index.js";

try { process.loadEnvFile?.(".env"); } catch { /* environment already provided */ }

const email = process.argv[2]?.trim().toLowerCase();
if (!email) {
  console.error("Usage: npm run admin:promote -- <email>");
  process.exit(1);
}

const prisma = new PrismaClient();
try {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, status: true } });
  if (!user) throw new Error(`No user found with email ${email}. Register the account first.`);
  if (user.status === "DELETED") throw new Error("Deleted accounts cannot be promoted.");
  await prisma.user.update({ where: { id: user.id }, data: { role: "SUPER_ADMIN", status: "ACTIVE", isSystemAccount: true, suspendedUntil: null, suspensionReason: null } });
  console.log(`${email} is now a protected Super Admin. Sign out and back in to see the admin panel link.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}
