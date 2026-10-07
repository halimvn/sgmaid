import { describe, it, expect } from "vitest";
import { parseDayFirstDate, formatIsoAsDayFirst, autoInsertDateSlash } from "@/lib/format-date";
import { parseAdminMaidForm } from "@/lib/validation/admin-maid";

/**
 * Admin form Date of Birth is typed as dd/mm/yyyy (a text field — a native date
 * input follows the viewer's region and can show mm/dd/yyyy) and stored as the
 * same ISO yyyy-mm-dd value as before. Pure tests, no DB.
 */

const TODAY = new Date(Date.UTC(2026, 9, 7)); // 7 Oct 2026

describe("parseDayFirstDate", () => {
  it("reads dd/mm/yyyy day-first, not month-first", () => {
    expect(parseDayFirstDate("07/08/1992", TODAY)).toEqual({ ok: true, iso: "1992-08-07" }); // 7 August
    expect(parseDayFirstDate("31/12/1990", TODAY)).toEqual({ ok: true, iso: "1990-12-31" }); // 31 would be an invalid month if read month-first
  });

  it.each([
    ["7/8/1992", "1992-08-07"],
    ["07-08-1992", "1992-08-07"],
    ["07.08.1992", "1992-08-07"],
    ["  07/08/1992  ", "1992-08-07"],
    ["1992-08-07", "1992-08-07"], // ISO still accepted
  ])("accepts %s", (input, iso) => {
    expect(parseDayFirstDate(input, TODAY)).toEqual({ ok: true, iso });
  });

  it("treats blank as not provided", () => {
    expect(parseDayFirstDate("", TODAY)).toEqual({ ok: true, iso: null });
    expect(parseDayFirstDate("   ", TODAY)).toEqual({ ok: true, iso: null });
  });

  it.each([
    "08/31/1992", // month-first input is rejected rather than silently misread
    "31/02/1990", // no such day
    "29/02/1991", // not a leap year
    "00/01/1990",
    "01/13/1990",
    "07/08/92", // two-digit year
    "07/08/1899", // before the sanity floor
    "08/10/2026", // after "today"
    "abc",
    "1992/08/07",
  ])("rejects %s", (input) => {
    expect(parseDayFirstDate(input, TODAY)).toEqual({ ok: false });
  });

  it("accepts a leap day, and today itself", () => {
    expect(parseDayFirstDate("29/02/1992", TODAY)).toEqual({ ok: true, iso: "1992-02-29" });
    expect(parseDayFirstDate("07/10/2026", TODAY)).toEqual({ ok: true, iso: "2026-10-07" });
  });
});

describe("formatIsoAsDayFirst", () => {
  it("formats an ISO date for display", () => {
    expect(formatIsoAsDayFirst("1992-08-07")).toBe("07/08/1992");
  });
  it("round-trips with the parser", () => {
    const shown = formatIsoAsDayFirst("1985-12-03");
    expect(parseDayFirstDate(shown, TODAY)).toEqual({ ok: true, iso: "1985-12-03" });
  });
  it("returns an empty string for missing or malformed input", () => {
    expect(formatIsoAsDayFirst(null)).toBe("");
    expect(formatIsoAsDayFirst(undefined)).toBe("");
    expect(formatIsoAsDayFirst("")).toBe("");
    expect(formatIsoAsDayFirst("07/08/1992")).toBe("");
  });
});

describe("admin maid form — dateOfBirth field", () => {
  function parse(dob: string) {
    const fd = new FormData();
    fd.set("profileCode", "ZZTEST-DOB");
    fd.set("name", "[Fictional] DOB Test");
    fd.set("maidType", "NEW");
    fd.set("profileStatus", "DRAFT");
    fd.set("availabilityStatus", "UNAVAILABLE");
    fd.set("dateOfBirth", dob);
    return parseAdminMaidForm(fd);
  }

  it("normalises dd/mm/yyyy to the ISO string the service stores", () => {
    const r = parse("07/08/1992");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dateOfBirth).toBe("1992-08-07");
  });

  it("blank stays undefined (optional field)", () => {
    const r = parse("");
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dateOfBirth).toBeUndefined();
  });

  it.each(["08/31/1992", "31/02/1990", "garbage"])("rejects %s", (bad) => {
    expect(parse(bad).success).toBe(false);
  });
});

describe("autoInsertDateSlash (typing helper)", () => {
  it("adds a slash once the day is complete, and again once the month is", () => {
    expect(autoInsertDateSlash("0", "07")).toBe("07/");
    expect(autoInsertDateSlash("07/0", "07/08")).toBe("07/08/");
  });
  it("does not interfere with typing single-digit parts with your own separators", () => {
    expect(autoInsertDateSlash("", "7")).toBe("7");
    expect(autoInsertDateSlash("7", "7/")).toBe("7/");
    expect(autoInsertDateSlash("7/", "7/8")).toBe("7/8");
    expect(autoInsertDateSlash("7/8", "7/8/")).toBe("7/8/");
    expect(autoInsertDateSlash("7/8/199", "7/8/1992")).toBe("7/8/1992");
  });
  it("formats an 8-digit paste or autofill as dd/mm/yyyy", () => {
    expect(autoInsertDateSlash("", "07081992")).toBe("07/08/1992");
  });
  it("never fights a backspace or a paste-replace", () => {
    expect(autoInsertDateSlash("07/", "07")).toBe("07");
    expect(autoInsertDateSlash("07/08/", "07/08")).toBe("07/08");
    expect(autoInsertDateSlash("07/08/1992", "07/08/1992")).toBe("07/08/1992");
  });
});
