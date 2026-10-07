"use client";

import { useRef, useState } from "react";
import { autoInsertDateSlash, formatIsoAsDayFirst, parseDayFirstDate } from "@/lib/format-date";

/**
 * Date of Birth input for the admin Add/Edit Maid form.
 *
 * A native <input type="date"> always shows the viewer's own region order
 * (mm/dd/yyyy on a US-region machine) and a website cannot change that, so the
 * value staff see and the value submitted is a text field that is always
 * dd/mm/yyyy. The calendar button opens a real native date picker (a hidden
 * type="date" input) purely to pick a day; the choice is written back into the
 * text field as dd/mm/yyyy. Typing works too, with the slashes inserted for you.
 *
 * Only the text field has a `name`, so exactly one value (dd/mm/yyyy) is
 * submitted, and the server-side parser (lib/validation/admin-maid.ts) is the
 * authority on whether it is a real, non-future date.
 */
export default function DateOfBirthField({ defaultIso }: { defaultIso: string | null }) {
  const [text, setText] = useState(formatIsoAsDayFirst(defaultIso));
  const pickerRef = useRef<HTMLInputElement>(null);

  const parsed = parseDayFirstDate(text);
  const pickerValue = parsed.ok && parsed.iso ? parsed.iso : "";
  const today = new Date().toISOString().slice(0, 10);

  function openPicker() {
    const picker = pickerRef.current;
    if (!picker) return;
    try {
      picker.showPicker();
    } catch {
      // Older browsers without showPicker(): focus + click is the closest fallback.
      picker.focus();
      picker.click();
    }
  }

  return (
    <div className="dob-field">
      <input
        type="text"
        id="dateOfBirth"
        name="dateOfBirth"
        inputMode="numeric"
        autoComplete="off"
        maxLength={10}
        placeholder="dd/mm/yyyy"
        pattern="\d{1,2}[\/.\-]\d{1,2}[\/.\-]\d{4}"
        title="Enter the date as dd/mm/yyyy, e.g. 07/08/1992"
        value={text}
        onChange={(e) => setText(autoInsertDateSlash(text, e.target.value))}
      />
      <button type="button" className="dob-field__btn" onClick={openPicker} aria-label="Pick date of birth from a calendar">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <rect x="3.5" y="5" width="17" height="15" rx="2.5" fill="none" stroke="currentColor" strokeWidth="1.8" />
          <path d="M3.5 10h17M8 3v4M16 3v4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        </svg>
      </button>
      {/* Picker only — no name, so it is never submitted. Visually hidden but still
          laid out next to the button so the browser anchors its popup there. */}
      <input
        ref={pickerRef}
        type="date"
        className="dob-field__picker"
        tabIndex={-1}
        aria-hidden="true"
        min="1900-01-01"
        max={today}
        value={pickerValue}
        onChange={(e) => setText(formatIsoAsDayFirst(e.target.value))}
      />
    </div>
  );
}
