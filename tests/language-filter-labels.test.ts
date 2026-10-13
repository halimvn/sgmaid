import { describe, it, expect } from "vitest";
import { FILTER_LANGUAGES, filterLanguageSlugsFor } from "@/lib/language-taxonomy";

/**
 * The employer Language filter shows four clean labels; each stored language entry, however
 * it was typed, is grouped under the label(s) whose related words it mentions. Pure tests.
 */
describe("filterLanguageSlugsFor", () => {
  it("offers exactly Arabic, Bahasa Indonesia, English, Malay and Mandarin", () => {
    expect(FILTER_LANGUAGES.map((l) => l.label)).toEqual(["Arabic", "Bahasa Indonesia", "English", "Malay", "Mandarin"]);
  });

  it.each([
    ["ARABIC & FAIR ENGLISH", ["arabic", "english"]],
    ["Bahasa Indonesia", ["bahasa-indonesia"]],
    ["Indonesian", ["bahasa-indonesia"]],
    ["Bahasa Indonesia & Bahasa Melayu", ["bahasa-indonesia", "malay"]],
    ["BAHASA INDONESIA & MALAY", ["bahasa-indonesia", "malay"]],
    ["Bahasa Melayu", ["malay"]], // Malay, not Indonesian
    ["FAIR ENGLISH & FAIR CANTONESE", ["english"]],
    ["FAIR-ENGLISH", ["english"]],
    ["MALAY", ["malay"]],
    ["MALAY & ARABIC", ["arabic", "malay"]],
    ["MALAY & FAIR ARABIC", ["arabic", "malay"]],
    ["MALAY & MODERATE ENGLISH", ["english", "malay"]],
    ["Mandarin", ["mandarin"]],
    ["Chinese", ["mandarin"]],
  ])("%s -> %j", (raw, slugs) => {
    expect([...filterLanguageSlugsFor(raw)].sort()).toEqual(slugs);
  });

  it("leaves unrelated languages out of every label", () => {
    expect(filterLanguageSlugsFor("Tagalog")).toEqual([]);
  });
});
