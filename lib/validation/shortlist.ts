import "server-only";
import { z } from "zod";

/**
 * Validation for maid identifiers passed into shortlist operations —
 * Phase 4. Prisma's `cuid()` ids are alphanumeric and bounded in length;
 * this doesn't need to match the exact cuid format, just reject anything
 * that couldn't possibly be one before it ever reaches Prisma — an
 * empty string, something absurdly long, or characters outside a safe
 * charset. Fails safe (returns null) rather than throwing.
 */
const maidIdSchema = z.string().trim().min(1).max(50).regex(/^[a-zA-Z0-9_-]+$/);

export function parseMaidId(value: unknown): string | null {
  const result = maidIdSchema.safeParse(value);
  return result.success ? result.data : null;
}
