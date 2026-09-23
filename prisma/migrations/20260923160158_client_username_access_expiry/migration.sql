-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_ACCESS_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_ACCESS_EXTENDED';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'CLIENT_STATUS_CHANGED';

-- AlterTable
ALTER TABLE "audit_logs" ADD COLUMN     "targetUserId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "accessExpiresAt" TIMESTAMP(3),
ADD COLUMN     "username" TEXT,
ALTER COLUMN "email" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "audit_logs_targetUserId_idx" ON "audit_logs"("targetUserId");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

