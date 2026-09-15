import "server-only";

/**
 * Central language normalization strategy — Phase 4.6.3 (employer
 * filter) / Phase 6 (admin data entry).
 *
 * Both the employer Language filter (lib/services/maids.ts) and the
 * admin maid form (lib/services/admin/maids.ts) funnel every raw
 * language value through normalizeLanguageLabel() before it's stored or
 * matched, so "Bahasa" typed by staff and "Bahasa Indonesia" extracted
 * from a biodata PDF are always the same value — never two separate
 * options an employer has to know are the same thing.
 *
 * Known spelling/naming variants for the same language, collapsed into
 * one canonical display label. This is a normalization aid, not a
 * mechanism for merging genuinely different languages — every key here
 * must be an unambiguous alternate spelling of the language it maps to.
 * Add an entry only when real biodata (or admin data entry) reveals a
 * genuine variant; never add one speculatively, and never use this to
 * invent a language that isn't actually present in the data.
 */
const LANGUAGE_ALIASES: Record<string, string> = {
  bahasa: "Bahasa Indonesia",
  "bahasa indonesia": "Bahasa Indonesia",
  indonesian: "Bahasa Indonesia",
  english: "English",
  tagalog: "Tagalog",
  burmese: "Burmese",
  myanmar: "Burmese",
  sinhala: "Sinhala",
  sinhalese: "Sinhala",
  khmer: "Khmer",
  cambodian: "Khmer",
};

/** Normalizes one raw language value to its canonical display label. Unknown values pass through as typed (trimmed) — never rejected, never invented. */
export function normalizeLanguageLabel(raw: string): string {
  const key = raw.trim().toLowerCase();
  return LANGUAGE_ALIASES[key] ?? raw.trim();
}

/** URL-safe slug for a canonical language label, e.g. "Bahasa Indonesia" -> "bahasa-indonesia". */
export function slugifyLanguage(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Parses admin-entered free text (comma or newline separated) into a
 * deduplicated list of normalized canonical labels. Empty entries are
 * dropped. Never infers a language from anything other than what was
 * actually typed — no nationality-based default.
 */
export function parseAndNormalizeLanguages(raw: string): string[] {
  const entries = raw
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map(normalizeLanguageLabel);
  return Array.from(new Set(entries));
}
