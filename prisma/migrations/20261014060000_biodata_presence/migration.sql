-- CreateTable
CREATE TABLE "biodata_presence" (
    "employerId" TEXT NOT NULL,
    "maidId" TEXT NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "biodataOpenedAt" TIMESTAMP(3),

    CONSTRAINT "biodata_presence_pkey" PRIMARY KEY ("employerId")
);

-- CreateIndex
CREATE INDEX "biodata_presence_lastSeenAt_idx" ON "biodata_presence"("lastSeenAt");

-- CreateIndex
CREATE INDEX "biodata_presence_biodataOpenedAt_idx" ON "biodata_presence"("biodataOpenedAt");

-- CreateIndex
CREATE INDEX "biodata_presence_maidId_idx" ON "biodata_presence"("maidId");

-- AddForeignKey
ALTER TABLE "biodata_presence" ADD CONSTRAINT "biodata_presence_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "biodata_presence" ADD CONSTRAINT "biodata_presence_maidId_fkey" FOREIGN KEY ("maidId") REFERENCES "maid_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

