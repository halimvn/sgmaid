import { describe, it, expect } from "vitest";
import { parseMaidFilters, PAGE_SIZE } from "@/lib/validation/maid-filters";

/**
 * Pure unit tests for the /dashboard/maids filter validation layer —
 * spec test #11 (invalid filters fail safely) and #12 (pagination is
 * bounded). No database, no auth — parseMaidFilters() never throws by
 * design, so these just assert it degrades to safe defaults.
 */

describe("parseMaidFilters", () => {
  it("11. a completely empty query string yields all-undefined filters and page 1", () => {
    const filters = parseMaidFilters({});
    expect(filters).toEqual({
      search: undefined,
      nationality: undefined,
      age: undefined,
      experience: undefined,
      skill: undefined,
      availability: undefined,
      page: 1,
    });
  });

  it("11. an unrecognized skill category value is dropped, not passed through", () => {
    const filters = parseMaidFilters({ skill: "not-a-real-category" });
    expect(filters.skill).toBeUndefined();
  });

  it("11. an unrecognized age bucket is dropped", () => {
    const filters = parseMaidFilters({ age: "100-200" });
    expect(filters.age).toBeUndefined();
  });

  it("11. an availability value outside the employer-visible set is dropped, never passed through", () => {
    // PLACED and UNAVAILABLE are deliberately not in the employer-visible
    // set (lib/maid-visibility.ts) — a hand-crafted ?availability=PLACED
    // must never reach the service as a usable filter value.
    for (const bogus of ["PLACED", "UNAVAILABLE", "placed", "not-a-status", ""]) {
      expect(parseMaidFilters({ availability: bogus }).availability).toBeUndefined();
    }
  });

  it("11. a valid availability value survives, case-insensitively", () => {
    expect(parseMaidFilters({ availability: "available" }).availability).toBe("AVAILABLE");
    expect(parseMaidFilters({ availability: "RESERVED" }).availability).toBe("RESERVED");
  });

  it("11. one invalid field does not discard the other, valid fields", () => {
    const filters = parseMaidFilters({ nationality: "Indonesian", skill: "bogus-category" });
    expect(filters.nationality).toBe("Indonesian");
    expect(filters.skill).toBeUndefined();
  });

  it("11. an oversized search string is rejected rather than passed to the database unbounded", () => {
    const filters = parseMaidFilters({ search: "x".repeat(500) });
    expect(filters.search).toBeUndefined();
  });

  it("12. a non-numeric page value falls back to page 1", () => {
    expect(parseMaidFilters({ page: "not-a-number" }).page).toBe(1);
  });

  it("12. a negative or zero page value falls back to page 1", () => {
    expect(parseMaidFilters({ page: "-5" }).page).toBe(1);
    expect(parseMaidFilters({ page: "0" }).page).toBe(1);
  });

  it("12. an absurdly large page value is bounded, not passed through unbounded", () => {
    const filters = parseMaidFilters({ page: "999999999" });
    // Falls back to the safe default (1) rather than requesting an
    // enormous, resource-wasting OFFSET from Postgres.
    expect(filters.page).toBe(1);
  });

  it("12. the page size constant is a small, fixed value (not attacker-controllable)", () => {
    expect(PAGE_SIZE).toBe(12);
  });

  it("array-valued query params (?page=1&page=2) use only the first value", () => {
    const filters = parseMaidFilters({ page: ["2", "3"] });
    expect(filters.page).toBe(2);
  });
});
