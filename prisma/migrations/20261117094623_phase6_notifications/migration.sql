-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('TOURNAMENT_REGISTRATION', 'TOURNAMENT_REGISTRATION_REVIEW', 'TOURNAMENT_REGISTRATION_CLOSED', 'TOURNAMENT_DRAW', 'TOURNAMENT_MATCH_SCHEDULED', 'TOURNAMENT_COMPLETED', 'TOURNAMENT_CANCELLED', 'SYSTEM');

-- AlterTable
ALTER TABLE "TournamentFixture" ADD COLUMN     "player1Withdrawn" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "player2Withdrawn" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT,
    "link" TEXT,
    "dedupeKey" TEXT,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_createdAt_idx" ON "Notification"("userId", "readAt", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Notification_userId_dedupeKey_key" ON "Notification"("userId", "dedupeKey");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
