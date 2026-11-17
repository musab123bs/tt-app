-- CreateEnum
CREATE TYPE "MatchCommandAction" AS ENUM ('START', 'POINT', 'UNDO', 'CONFIRM_GAME', 'FINISH', 'ABANDON');

-- CreateTable
CREATE TABLE "MatchCommand" (
    "id" TEXT NOT NULL,
    "matchId" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "action" "MatchCommandAction" NOT NULL,
    "actorId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MatchCommand_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "MatchCommand_matchId_createdAt_idx" ON "MatchCommand"("matchId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "MatchCommand_matchId_requestId_key" ON "MatchCommand"("matchId", "requestId");

-- AddForeignKey
ALTER TABLE "MatchCommand" ADD CONSTRAINT "MatchCommand_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MatchCommand" ADD CONSTRAINT "MatchCommand_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
