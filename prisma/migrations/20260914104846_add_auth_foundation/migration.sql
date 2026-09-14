-- CreateEnum
CREATE TYPE "AuthTokenPurpose" AS ENUM ('ACCOUNT_SETUP', 'PASSWORD_RESET');

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "sessionVersion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "user_auth_tokens" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "purpose" "AuthTokenPurpose" NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "usedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_auth_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" TEXT NOT NULL,
    "identifierHash" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_auth_tokens_tokenHash_key" ON "user_auth_tokens"("tokenHash");

-- CreateIndex
CREATE INDEX "user_auth_tokens_userId_idx" ON "user_auth_tokens"("userId");

-- CreateIndex
CREATE INDEX "user_auth_tokens_purpose_idx" ON "user_auth_tokens"("purpose");

-- CreateIndex
CREATE INDEX "user_auth_tokens_expiresAt_idx" ON "user_auth_tokens"("expiresAt");

-- CreateIndex
CREATE INDEX "login_attempts_identifierHash_createdAt_idx" ON "login_attempts"("identifierHash", "createdAt");

-- AddForeignKey
ALTER TABLE "user_auth_tokens" ADD CONSTRAINT "user_auth_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
