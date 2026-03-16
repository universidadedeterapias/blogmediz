-- CreateTable
CREATE TABLE "AlineLead" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "messageCount" INTEGER NOT NULL DEFAULT 0,
    "summary" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AlineLead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AlineLead_email_idx" ON "AlineLead"("email");
