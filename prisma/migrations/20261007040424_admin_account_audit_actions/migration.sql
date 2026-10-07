-- AlterEnum: audit actions for staff (ADMIN) account management. Additive only.
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_ACCOUNT_CREATED';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_PASSWORD_RESET';
ALTER TYPE "AuditAction" ADD VALUE 'ADMIN_STATUS_CHANGED';
