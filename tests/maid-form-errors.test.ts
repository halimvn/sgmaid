import { describe, it, expect } from "vitest";
import { explainDayFirstDateProblem } from "@/lib/format-date";
import { parseAdminMaidForm, collectMaidFormErrors, collectMaidFormValues } from "@/lib/validation/admin-maid";

/**
 * The Add/Edit Maid form tells the admin exactly which field is wrong (and why) instead of a
 * generic "check the form". Pure tests, no DB.
 */

const TODAY = new Date(Date.UTC(2026, 9, 7));

describe("explainDayFirstDateProblem", () => {
  it("names the real problem for a date that does not exist", () => {
    expect(explainDayFirstDateProblem("31/09/1986", TODAY)).toBe(
      "31/09/1986 is not a real date — September 1986 only has 30 days."
    );
    expect(explainDayFirstDateProblem("29/02/1991", TODAY)).toContain("February 1991 only has 28 days");
    expect(explainDayFirstDateProblem("15/13/1990", TODAY)).toContain("month must be between 01 and 12");
  });

  it("explains future dates, too-old years and wrong formats", () => {
    expect(explainDayFirstDateProblem("08/10/2026", TODAY)).toBe("The date of birth cannot be in the future.");
    expect(explainDayFirstDateProblem("01/01/1850", TODAY)).toContain("1900");
    expect(explainDayFirstDateProblem("hello", TODAY)).toContain("dd/mm/yyyy");
  });

  it("says nothing for valid or blank dates", () => {
    expect(explainDayFirstDateProblem("07/08/1992", TODAY)).toBeNull();
    expect(explainDayFirstDateProblem("", TODAY)).toBeNull();
  });
});

describe("collectMaidFormErrors", () => {
  function form(overrides: Record<string, string>) {
    const fd = new FormData();
    const base: Record<string, string> = {
      profileCode: "ZZTEST-ERR",
      name: "Test",
      maidType: "NEW",
      profileStatus: "DRAFT",
      availabilityStatus: "UNAVAILABLE",
    };
    for (const [k, v] of Object.entries({ ...base, ...overrides })) fd.set(k, v);
    return fd;
  }

  it("reports a non-existent date of birth against the Date of Birth field", () => {
    const parsed = parseAdminMaidForm(form({ dateOfBirth: "31/09/1986" }));
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const { fieldErrors, errorList } = collectMaidFormErrors(parsed.error);
    expect(fieldErrors.dateOfBirth).toContain("is not a real date");
    expect(errorList).toEqual([{ label: "Date of Birth", message: fieldErrors.dateOfBirth }]);
  });

  it("reports every problem at once, each against its own field, in readable words", () => {
    const parsed = parseAdminMaidForm(
      form({
        name: "",
        maidType: "",
        heightCm: "abc",
        yearsExperience: "lots",
        "employmentHistory.1.country": "Singapore",
        "employmentHistory.1.startYear": "1700",
      })
    );
    expect(parsed.success).toBe(false);
    if (parsed.success) return;
    const { fieldErrors, errorList } = collectMaidFormErrors(parsed.error);
    expect(fieldErrors.name).toBe("Name is required.");
    expect(fieldErrors.maidType).toBe("Select a maid type.");
    expect(fieldErrors.heightCm).toBeDefined();
    expect(fieldErrors.yearsExperience).toContain("number");
    expect(fieldErrors["employmentHistory.1.startYear"]).toBeDefined();
    const labels = errorList.map((e) => e.label);
    expect(labels).toContain("Height (cm)");
    expect(labels).toContain("Employment History, row 2 — Start Year");
  });
});

describe("collectMaidFormValues", () => {
  it("keeps typed text and every ticked expertise, skips files and Next.js hidden fields", () => {
    const fd = new FormData();
    fd.set("name", "Khodijah");
    fd.append("expertise", "cooking");
    fd.append("expertise", "eldercare");
    fd.set("photo", new File(["x"], "p.jpg", { type: "image/jpeg" }));
    fd.set("$ACTION_ID_abc", "1");
    expect(collectMaidFormValues(fd)).toEqual({ name: "Khodijah", expertise: ["cooking", "eldercare"] });
  });
});
