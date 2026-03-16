-- CreateTable
CREATE TABLE "AlineSession" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AlineSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "AlineSession_sessionId_key" ON "AlineSession"("sessionId");

-- CreateIndex
CREATE INDEX "AlineSession_sessionId_idx" ON "AlineSession"("sessionId");
