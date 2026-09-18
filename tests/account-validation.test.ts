import { describe, it, expect } from "vitest";
import { updateProfileSchema, changePasswordSchema } from "@/lib/validation/account";
import { PASSWORD_MIN_LENGTH } from "@/lib/auth/constants";

/**
 * Pure unit tests for the employer "My Account" Zod schemas — Phase 7.
 * No database, no auth — mirrors tests/maid-filters.test.ts's pattern
 * for validation-layer-only coverage.
 */

describe("updateProfileSchema", () => {
  it("accepts a valid full name and mobile number", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Jane Tan", mobileNumber: "+65 9123 4567" });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual({ fullName: "Jane Tan", mobileNumber: "+65 9123 4567" });
    }
  });

  it("10. an empty full name is rejected with a field-specific error", () => {
    const result = updateProfileSchema.safeParse({ fullName: "", mobileNumber: "" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "fullName")).toBe(true);
    }
  });

  it("trims whitespace from the full name", () => {
    const result = updateProfileSchema.safeParse({ fullName: "  Jane Tan  ", mobileNumber: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.fullName).toBe("Jane Tan");
  });

  it("an empty mobile number is allowed and normalizes to undefined (mobile number is optional)", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Jane Tan", mobileNumber: "" });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.mobileNumber).toBeUndefined();
  });

  it("accepts Singapore-local and international mobile number formats without excessive validation", () => {
    for (const mobile of ["91234567", "9123 4567", "+65 9123 4567", "+1 415-555-0132", "(65) 9123-4567"]) {
      const result = updateProfileSchema.safeParse({ fullName: "Jane Tan", mobileNumber: mobile });
      expect(result.success, `expected "${mobile}" to be accepted`).toBe(true);
    }
  });

  it("10. a mobile number containing letters is rejected with a field-specific error", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Jane Tan", mobileNumber: "call-me-maybe" });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path[0] === "mobileNumber")).toBe(true);
    }
  });

  it("an oversized mobile number is rejected", () => {
    const result = updateProfileSchema.safeParse({ fullName: "Jane Tan", mobileNumber: "9".repeat(40) });
    expect(result.success).toBe(false);
  });

  it("one invalid field does not swallow the other field's own error", () => {
    const result = updateProfileSchema.safeParse({ fullName: "", mobileNumber: "not-a-number" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((i) => i.path[0]);
      expect(paths).toContain("fullName");
      expect(paths).toContain("mobileNumber");
    }
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
