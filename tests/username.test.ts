import { describe, it, expect } from "vitest";
import { normalizeUsername } from "@/lib/auth/username";

/**
 * Phase 8 test #3: username normalization (lib/auth/username.ts) — pure
 * logic, no DB, no auth.
 */
describe("normalizeUsername", () => {
  it("trims and lowercases", () => {
    expect(normalizeUsername("  AhmadTan  ")).toBe("ahmadtan");
  });

  it("'AhmadTan' and 'ahmadtan' normalize to the exact same identity", () => {
    expect(normalizeUsername("AhmadTan")).toBe(normalizeUsername("ahmadtan"));
  });

  it("accepts letters, numbers, and . _ - separators", () => {
    expect(normalizeUsername("nur.aisyah")).toBe("nur.aisyah");
    expect(normalizeUsername("client_1024")).toBe("client_1024");
    expect(normalizeUsername("client-1024")).toBe("client-1024");
    expect(normalizeUsername("client1024")).toBe("client1024");
  });

  it("rejects an email-shaped value outright (never collides with an email identifier)", () => {
    expect(normalizeUsername("ahmad@example.test")).toBeNull();
  });

  it("rejects spaces", () => {
    expect(normalizeUsername("ahmad tan")).toBeNull();
  });

  it("rejects empty / whitespace-only input", () => {
    expect(normalizeUsername("")).toBeNull();
    expect(normalizeUsername("   ")).toBeNull();
  });

  it("rejects a username shorter than the minimum length", () => {
    expect(normalizeUsername("ab")).toBeNull();
    expect(normalizeUsername("abc")).toBe("abc");
  });

  it("rejects a username longer than the maximum length", () => {
    expect(normalizeUsername("a".repeat(33))).toBeNull();
    expect(normalizeUsername("a".repeat(32))).toBe("a".repeat(32));
  });

  it("rejects other special characters", () => {
    for (const bad of ["ahmad!tan", "ahmad/tan", "ahmad<tan>", "'; DROP TABLE users; --"]) {
      expect(normalizeUsername(bad)).toBeNull();
    }
  });
});
