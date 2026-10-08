/**
 * Day/month/year handling for the admin form's Date of Birth field.
 *
 * Why this exists instead of <input type="date">: a native date input shows
 * whatever order the viewer's browser/OS region uses (mm/dd/yyyy on a US-region
 * machine) and a website cannot override that. The agency works day-first
 * (dd/mm/yyyy), so the field is plain text and parsed here. Pure functions, no
 * server-only imports, so both the form (display) and validation (parsing) use it.
 *
 * The stored value is unchanged: an ISO "yyyy-mm-dd" date (UTC midnight), exactly
 * what the date input used to submit.
 */

const DAY_FIRST = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Earliest year accepted — a sanity floor, not a policy. */
const MIN_YEAR = 1900;

export type DobParseResult = { ok: true; iso: string | null } | { ok: false };

function buildIso(year: number, month: number, day: number, today: Date): string | null {
  if (year < MIN_YEAR) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  // Reject rollovers such as 31/02/1990 or 29/02/1991, which Date would silently shift.
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) return null;
  // A date of birth can't be in the future.
  if (d.getTime() > Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Accepts dd/mm/yyyy (also d/m/yyyy, and "-" or "." as separators) and, for
 * safety, an ISO yyyy-mm-dd. Blank means "not provided" (ok, iso null).
 */
export function parseDayFirstDate(raw: string, today: Date = new Date()): DobParseResult {
  const value = raw.trim();
  if (value === "") return { ok: true, iso: null };

  const dayFirst = DAY_FIRST.exec(value);
  if (dayFirst) {
    const iso = buildIso(Number(dayFirst[3]), Number(dayFirst[2]), Number(dayFirst[1]), today);
    return iso ? { ok: true, iso } : { ok: false };
  }

  const iso = ISO.exec(value);
  if (iso) {
    const result = buildIso(Number(iso[1]), Number(iso[2]), Number(iso[3]), today);
    return result ? { ok: true, iso: result } : { ok: false };
  }

  return { ok: false };
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/**
 * Says WHY a Date of Birth is rejected, in words an admin can act on — or null when it is
 * acceptable (including blank). parseDayFirstDate stays the single authority on accept/reject;
 * this only explains a rejection, e.g. "31/09/1986 is not a real date — September 1986 only
 * has 30 days."
 */
export function explainDayFirstDateProblem(raw: string, today: Date = new Date()): string | null {
  if (parseDayFirstDate(raw, today).ok) return null;

  const value = raw.trim();
  const dayFirst = DAY_FIRST.exec(value);
  const iso = ISO.exec(value);
  if (!dayFirst && !iso) return "Enter the date of birth as dd/mm/yyyy, e.g. 07/08/1992.";

  const day = dayFirst ? Number(dayFirst[1]) : Number(iso![3]);
  const month = dayFirst ? Number(dayFirst[2]) : Number(iso![2]);
  const year = dayFirst ? Number(dayFirst[3]) : Number(iso![1]);

  if (year < MIN_YEAR) return `The year must be ${MIN_YEAR} or later.`;
  if (month < 1 || month > 12) return `${value} is not a real date — the month must be between 01 and 12.`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return `${value} is not a real date — ${MONTH_NAMES[month - 1]} ${year} only has ${daysInMonth} days.`;
  }
  return "The date of birth cannot be in the future.";
}

/** "1992-08-07" -> "07/08/1992". Anything that isn't an ISO date yields "". */
export function formatIsoAsDayFirst(iso: string | null | undefined): string {
  const m = iso ? ISO.exec(iso) : null;
  return m ? `${m[3]}/${m[2]}/${m[1]}` : "";
}

/**
 * Typing helper for the Date of Birth text field: after the day ("07") and month
 * ("07/08") are completed, append the "/" so staff can just keep typing digits.
 * Only acts when the text is growing (never fights a backspace), and never
 * touches a value the user is typing with their own separators ("7/8/1992").
 * Also formats an unambiguous 8-digit paste/autofill ("07081992") as dd/mm/yyyy.
 */
export function autoInsertDateSlash(previous: string, next: string): string {
  if (next.length <= previous.length) return next;
  if (/^\d{8}$/.test(next)) return `${next.slice(0, 2)}/${next.slice(2, 4)}/${next.slice(4)}`;
  if (/^\d{2}$/.test(next) || /^\d{1,2}[/.-]\d{2}$/.test(next)) return `${next}/`;
  return next;
}
