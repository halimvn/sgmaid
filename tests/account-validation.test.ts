import { describe, it, expect } from "vitest";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation/account";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";

/**
 * Pure unit tests for the employer "My Account" Zod schemas — Phase 7.
 * No database, no auth — mirrors tests/maid-filters.test.ts's pattern
 * for validation-layer-only coverage.
 */

describe("updateProfileSchema", () => {
  it("accepts a valid full name", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Jane Tan" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toEqual({ fullName: "Jane Tan" });
  });

  it("does not collect a mobile number any more — one that is sent is ignored, not validated", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Jane Tan", mobileNumber: "call-me-maybe" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data).not.toHaveProperty("mobileNumber");
  });

  it("10. an empty full name is rejected with a field-specific error", () => {
    const result = updateProfileSchema.safeParse({ fullName: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "fullName")).toBe(true);
    }
  });

  it("trims whitespace from the full name", () => {
    const result = updateProfileSchema.safeParse({ fullName: "  Jane Tan  " });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe("Jane Tan");
  });
});

describe("changePasswordSchema", () => {
  const validNew = "a-long-enough-passphrase";

  it("accepts matching, sufficiently long passwords", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever-it-was",
      newPassword: validNew,
      confirmNewPassword: validNew,
    });
    expect(result.success).toBe(true);
  });

  it("14. mismatched new/confirm passwords are rejected, error attached to confirmNewPassword", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever-it-was",
      newPassword: validNew,
      confirmNewPassword: `${validNew}-different`,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "confirmNewPassword")).toBe(true);
    }
  });

  it("reuses PASSWORD_MIN_LENGTH — a too-short new password is rejected", () => {
    const short = "a".repeat(PASSWORD_MIN_LENGTH - 1);
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever-it-was",
      newPassword: short,
      confirmNewPassword: short,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "newPassword")).toBe(true);
    }
  });

  it("a password exactly PASSWORD_MIN_LENGTH long is accepted", () => {
    const exact = "a".repeat(PASSWORD_MIN_LENGTH);
    const result = changePasswordSchema.safeParse({
      currentPassword: "whatever-it-was",
      newPassword: exact,
      confirmNewPassword: exact,
    });
    expect(result.success).toBe(true);
  });

  it("an empty current password is rejected", () => {
    const result = changePasswordSchema.safeParse({
      currentPassword: "",
      newPassword: validNew,
      confirmNewPassword: validNew,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "currentPassword")).toBe(true);
    }
  });
});
