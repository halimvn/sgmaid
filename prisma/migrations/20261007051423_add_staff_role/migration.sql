-- AlterEnum: back-office STAFF role (admin area minus staff-account management). Additive only;
-- existing ADMIN rows are unchanged by this migration.
ALTER TYPE "UserRole" ADD VALUE 'STAFF';
