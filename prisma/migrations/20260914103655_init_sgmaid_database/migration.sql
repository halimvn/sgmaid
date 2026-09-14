-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('EMPLOYER', 'ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaidProfileStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "MaidAvailabilityStatus" AS ENUM ('AVAILABLE', 'RESERVED', 'PLACED', 'UNAVAILABLE');

-- CreateEnum
CREATE TYPE "SkillCategory" AS ENUM ('CHILDCARE', 'ELDERLY_CARE', 'HOUSEKEEPING', 'COOKING', 'PET_CARE');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERIENCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "ConsultationStatus" AS ENUM ('NEW', 'CONTACTED', 'SCHEDULED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('PHONE', 'WHATSAPP', 'EMAIL');

-- CreateEnum
CREATE TYPE "EnquiryStatus" AS ENUM ('NEW', 'CONTACTED', 'CLOSED');

-- CreateEnum
CREATE TYPE "EnquirySource" AS ENUM ('HOMEPAGE', 'CONTACT_PAGE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "mobileNumber" TEXT,
    "passwordHash" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'EMPLOYER',
    "status" "UserStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "lastLoginAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maid_profiles" (
    "id" TEXT NOT NULL,
    "profileCode" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "photoUrl" TEXT,
    "nationality" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(3),
    "languages" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "yearsExperience" INTEGER NOT NULL DEFAULT 0,
    "profileStatus" "MaidProfileStatus" NOT NULL DEFAULT 'DRAFT',
    "availabilityStatus" "MaidAvailabilityStatus" NOT NULL DEFAULT 'UNAVAILABLE',
    "internalNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "maid_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employment_history" (
    "id" TEXT NOT NULL,
    "maidId" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "duties" TEXT,
    "householdDescription" TEXT,
    "reasonForLeaving" TEXT,
    "notes" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employment_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "skills" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "category" "SkillCategory" NOT NULL,

    CONSTRAINT "skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maid_skills" (
    "id" TEXT NOT NULL,
    "maidId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,
    "experienceLevel" "SkillLevel",
    "yearsExperience" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "maid_skills_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "training_modules" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "category" TEXT,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "training_modules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "maid_trainings" (
    "id" TEXT NOT NULL,
    "maidId" TEXT NOT NULL,
    "trainingModuleId" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "notes" TEXT,

    CONSTRAINT "maid_trainings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shortlists" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "maidId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "shortlists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_requests" (
    "id" TEXT NOT NULL,
    "employerId" TEXT NOT NULL,
    "message" TEXT,
    "preferredContactMethod" "ContactMethod" NOT NULL DEFAULT 'WHATSAPP',
    "status" "ConsultationStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "consultation_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consultation_maids" (
    "id" TEXT NOT NULL,
    "consultationRequestId" TEXT NOT NULL,
    "maidId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consultation_maids_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "enquiries" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "careOrServiceNeeded" TEXT,
    "message" TEXT,
    "source" "EnquirySource" NOT NULL,
    "status" "EnquiryStatus" NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "enquiries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "users_status_idx" ON "users"("status");

-- CreateIndex
CREATE UNIQUE INDEX "maid_profiles_profileCode_key" ON "maid_profiles"("profileCode");

-- CreateIndex
CREATE INDEX "maid_profiles_nationality_idx" ON "maid_profiles"("nationality");

-- CreateIndex
CREATE INDEX "maid_profiles_profileStatus_idx" ON "maid_profiles"("profileStatus");

-- CreateIndex
CREATE INDEX "maid_profiles_availabilityStatus_idx" ON "maid_profiles"("availabilityStatus");

-- CreateIndex
CREATE INDEX "maid_profiles_profileStatus_availabilityStatus_idx" ON "maid_profiles"("profileStatus", "availabilityStatus");

-- CreateIndex
CREATE INDEX "employment_history_maidId_idx" ON "employment_history"("maidId");

-- CreateIndex
CREATE UNIQUE INDEX "skills_name_key" ON "skills"("name");

-- CreateIndex
CREATE UNIQUE INDEX "skills_slug_key" ON "skills"("slug");

-- CreateIndex
CREATE INDEX "skills_category_idx" ON "skills"("category");

-- CreateIndex
CREATE INDEX "maid_skills_skillId_idx" ON "maid_skills"("skillId");

-- CreateIndex
CREATE UNIQUE INDEX "maid_skills_maidId_skillId_key" ON "maid_skills"("maidId", "skillId");

-- CreateIndex
CREATE UNIQUE INDEX "training_modules_title_key" ON "training_modules"("title");

-- CreateIndex
CREATE INDEX "maid_trainings_trainingModuleId_idx" ON "maid_trainings"("trainingModuleId");

-- CreateIndex
CREATE UNIQUE INDEX "maid_trainings_maidId_trainingModuleId_key" ON "maid_trainings"("maidId", "trainingModuleId");

-- CreateIndex
CREATE INDEX "shortlists_maidId_idx" ON "shortlists"("maidId");

-- CreateIndex
CREATE UNIQUE INDEX "shortlists_employerId_maidId_key" ON "shortlists"("employerId", "maidId");

-- CreateIndex
CREATE INDEX "consultation_requests_employerId_idx" ON "consultation_requests"("employerId");

-- CreateIndex
CREATE INDEX "consultation_requests_status_idx" ON "consultation_requests"("status");

-- CreateIndex
CREATE INDEX "consultation_maids_maidId_idx" ON "consultation_maids"("maidId");

-- CreateIndex
CREATE UNIQUE INDEX "consultation_maids_consultationRequestId_maidId_key" ON "consultation_maids"("consultationRequestId", "maidId");

-- CreateIndex
CREATE INDEX "enquiries_status_idx" ON "enquiries"("status");

-- CreateIndex
CREATE INDEX "enquiries_createdAt_idx" ON "enquiries"("createdAt");

-- AddForeignKey
ALTER TABLE "employment_history" ADD CONSTRAINT "employment_history_maidId_fkey" FOREIGN KEY ("maidId") REFERENCES "maid_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maid_skills" ADD CONSTRAINT "maid_skills_maidId_fkey" FOREIGN KEY ("maidId") REFERENCES "maid_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maid_skills" ADD CONSTRAINT "maid_skills_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "skills"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maid_trainings" ADD CONSTRAINT "maid_trainings_maidId_fkey" FOREIGN KEY ("maidId") REFERENCES "maid_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "maid_trainings" ADD CONSTRAINT "maid_trainings_trainingModuleId_fkey" FOREIGN KEY ("trainingModuleId") REFERENCES "training_modules"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shortlists" ADD CONSTRAINT "shortlists_maidId_fkey" FOREIGN KEY ("maidId") REFERENCES "maid_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_requests" ADD CONSTRAINT "consultation_requests_employerId_fkey" FOREIGN KEY ("employerId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_maids" ADD CONSTRAINT "consultation_maids_consultationRequestId_fkey" FOREIGN KEY ("consultationRequestId") REFERENCES "consultation_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consultation_maids" ADD CONSTRAINT "consultation_maids_maidId_fkey" FOREIGN KEY ("maidId") REFERENCES "maid_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
