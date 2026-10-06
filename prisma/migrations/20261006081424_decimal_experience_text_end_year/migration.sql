-- AlterTable: employment history end year becomes free text ("Current", "Now", or a year).
-- Existing integer years convert to their text form, no data loss.
ALTER TABLE "employment_history" ALTER COLUMN "endYear" SET DATA TYPE TEXT;

-- AlterTable: years of experience becomes decimal (e.g. 2.5). Whole numbers carry over unchanged.
ALTER TABLE "maid_profiles" ALTER COLUMN "yearsExperience" SET DATA TYPE DOUBLE PRECISION;
