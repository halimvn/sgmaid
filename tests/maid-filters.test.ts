import { describe, it, expect } from "vitest";
import { parseMaidFilters, PAGE_SIZE } from "@/lib/validation/maid-filters";

/**
 * Pure unit tests for the /dashboard/maids filter validation layer —
 * spec test #11 (invalid filters fail safely) and #12 (pagination is
 * bounded), plus the Phase 4.6.3 multi-select filters (Maid Type,
 * Expertise, Marital, Language). No database, no auth —
 * parseMaidFilters() never throws by design, so these just assert it
 * degrades to safe defaults. Language *option* validity (which slugs
 * actually correspond to real data) is data-driven and tested in
 * maids-integration.test.ts — this file only covers shape validation.
 */

describe("parseMaidFilters", () => {
  it("11. a completely empty query string yields all-undefined filters and page 1", () => {
    const filters = parseMaidFilters({});
    expect(filters).toEqual({
      search: undefined,
      nationality: undefined,
      age: undefined,
      experience: undefined,
      expertise: undefined,
      maidType: undefined,
      marital: undefined,
      language: undefined,
      availability: undefined,
      page: 1,
    });
  });

  it("11. an unrecognized expertise category value is dropped, not passed through", () => {
    const filters = parseMaidFilters({ expertise: "not-a-real-category" });
    expect(filters.expertise).toBeUndefined();
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
    const filters = parseMaidFilters({ nationality: "Indonesian", expertise: "bogus-category" });
    expect(filters.nationality).toBe("Indonesian");
    expect(filters.expertise).toBeUndefined();
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

  it("array-valued single-select query params (?page=1&page=2) use only the first value", () => {
    const filters = parseMaidFilters({ page: ["2", "3"] });
    expect(filters.page).toBe(2);
  });
});

describe("parseMaidFilters — Phase 4.6.3 multi-select filters", () => {
  it("1. a single Maid Type value is accepted", () => {
    expect(parseMaidFilters({ maidType: "new-maid" }).maidType).toEqual(["new-maid"]);
  });

  it("1. multiple Maid Type values (repeated query param) are all accepted", () => {
    const filters = parseMaidFilters({ maidType: ["new-maid", "ex-singapore-maid"] });
    expect(filters.maidType).toEqual(["new-maid", "ex-singapore-maid"]);
  });

  it("1. all four Maid Type values validate", () => {
    const filters = parseMaidFilters({
      maidType: ["new-maid", "transfer-maid", "ex-singapore-maid", "ex-others-maid"],
    });
    expect(filters.maidType).toHaveLength(4);
  });

  it("2. a single Expertise value is accepted", () => {
    expect(parseMaidFilters({ expertise: "childcare" }).expertise).toEqual(["childcare"]);
  });

  it("2. multiple Expertise values (Childcare + Cooking) are all accepted", () => {
    const filters = parseMaidFilters({ expertise: ["childcare", "cooking"] });
    expect(filters.expertise).toEqual(["childcare", "cooking"]);
  });

  it("2. exactly the approved Expertise categories validate, nothing else does", () => {
    const filters = parseMaidFilters({
      expertise: [
        "cooking",
        "eldercare",
        "childcare",
        "infantcare",
        "general-housekeeping",
        "care-of-disabled",
        "pet-care",
      ],
    });
    // pet-care is a real Skill category in the schema but is not one of
    // the approved employer-facing Expertise options — it must be
    // dropped, not silently accepted.
    expect(filters.expertise).toEqual([
      "cooking",
      "eldercare",
      "childcare",
      "infantcare",
      "general-housekeeping",
      "care-of-disabled",
    ]);
  });

  it("3. a single Marital value is accepted", () => {
    expect(parseMaidFilters({ marital: "married" }).marital).toEqual(["married"]);
  });

  it("3. multiple Marital values are all accepted", () => {
    const filters = parseMaidFilters({ marital: ["single", "divorced"] });
    expect(filters.marital).toEqual(["single", "divorced"]);
  });

  it("3. an unrecognized Marital value is dropped", () => {
    expect(parseMaidFilters({ marital: "engaged" }).marital).toBeUndefined();
  });

  it("4. a well-formed language slug is accepted", () => {
    expect(parseMaidFilters({ language: "bahasa-indonesia" }).language).toEqual(["bahasa-indonesia"]);
  });

  it("4. multiple language slugs are all accepted", () => {
    const filters = parseMaidFilters({ language: ["bahasa-indonesia", "english"] });
    expect(filters.language).toEqual(["bahasa-indonesia", "english"]);
  });

  it("4. a malformed language value (not slug-shaped) is dropped", () => {
    for (const bogus of ["Bahasa Indonesia", "<script>", "a".repeat(100), ""]) {
      expect(parseMaidFilters({ language: bogus }).language).toBeUndefined();
    }
  });

  it("8. invalid values inside a multi-select list are dropped individually, valid ones survive", () => {
    const filters = parseMaidFilters({
      maidType: ["new-maid", "not-a-real-type", "transfer-maid"],
    });
    expect(filters.maidType).toEqual(["new-maid", "transfer-maid"]);
  });

  it("8. a multi-select field with only invalid values ends up undefined, not an empty array", () => {
    expect(parseMaidFilters({ maidType: ["bogus-1", "bogus-2"] }).maidType).toBeUndefined();
  });

  it("duplicate values in a multi-select are deduplicated", () => {
    expect(parseMaidFilters({ expertise: ["cooking", "cooking", "childcare"] }).expertise).toEqual([
      "cooking",
      "childcare",
    ]);
  });

  it("9. an absent Marital filter is undefined, never a guessed/invented value", () => {
    expect(parseMaidFilters({}).marital).toBeUndefined();
  });
});
