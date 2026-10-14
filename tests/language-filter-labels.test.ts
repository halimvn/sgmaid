import { describe, it, expect } from "vitest";
import { FILTER_LANGUAGES, filterLanguageSlugsFor } from "@/lib/language-taxonomy";

/**
 * The employer Language filter shows four clean labels; each stored language entry, however
 * it was typed, is grouped under the label(s) whose related words it mentions. Pure tests.
 */
describe("filterLanguageSlugsFor", () => {
  it("offers exactly English, Malay and Mandarin", () => {
    expect(FILTER_LANGUAGES.map((l) => l.label)).toEqual(["English", "Malay", "Mandarin"]);
  });

  it.each([
    ["ARABIC & FAIR ENGLISH", ["english"]], // Arabic is not a filter option; the English part still matches
    ["Bahasa Indonesia & Bahasa Melayu", ["malay"]],
    ["BAHASA INDONESIA & MALAY", ["malay"]],
    ["Bahasa Melayu", ["malay"]],
    ["FAIR ENGLISH & FAIR CANTONESE", ["english"]],
    ["FAIR-ENGLISH", ["english"]],
    ["MALAY", ["malay"]],
    ["MALAY & ARABIC", ["malay"]],
    ["MALAY & FAIR ARABIC", ["malay"]],
    ["MALAY & MODERATE ENGLISH", ["english", "malay"]],
    ["Mandarin", ["mandarin"]],
    ["Chinese", ["mandarin"]],
  ])("%s -> %j", (raw, slugs) => {
    expect([...filterLanguageSlugsFor(raw)].sort()).toEqual(slugs);
  });

  it("leaves unrelated languages out of every label", () => {
    expect(filterLanguageSlugsFor("Tagalog")).toEqual([]);
    expect(filterLanguageSlugsFor("Bahasa Indonesia")).toEqual([]);
    expect(filterLanguageSlugsFor("Arabic")).toEqual([]);
  });
});
