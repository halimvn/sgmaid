-- CreateEnum
CREATE TYPE "MaidType" AS ENUM ('NEW', 'TRANSFER');

-- CreateEnum
CREATE TYPE "MaritalStatus" AS ENUM ('SINGLE', 'MARRIED', 'DIVORCED', 'WIDOWED');

-- CreateEnum
CREATE TYPE "MaidDocumentType" AS ENUM ('BIODATA_PDF');

-- AlterTable
ALTER TABLE "employment_history" ADD COLUMN     "endYear" INTEGER,
ADD COLUMN     "startYear" INTEGER,
ALTER COLUMN "startDate" DROP NOT NULL;

-- AlterTable
ALTER TABLE "maid_profiles" ADD COLUMN     "heightCm" INTEGER,
ADD COLUMN     "maidType" "MaidType",
ADD COLUMN     "maritalStatus" "MaritalStatus",
ADD COLUMN     "weightKg" INTEGER;

-- CreateTable
CREATE TABLE "maid_documents" (
    "id" TEXT NOT NULL,
    "maidId" TEXT NOT NULL,
    "type" "MaidDocumentType" NOT NULL,
    "storagePath" TEXT NOT NULL,
    "originalFileName" TEXT,
    "mimeType" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maid_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "maid_documents_maidId_type_key" ON "maid_documents"("maidId", "type");

-- AddForeignKey
ALTER TABLE "maid_documents" ADD CONSTRAINT "maid_documents_maidId_fkey" FOREIGN KEY ("maidId") REFERENCES "maid_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
