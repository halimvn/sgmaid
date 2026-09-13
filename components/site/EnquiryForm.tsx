"use client";

type EnquiryFormProps = {
  heading: string;
  selectLabel: string;
  selectOptions: string[];
  submitLabel: string;
  altHref: string;
};

/**
 * Shared enquiry form card (homepage "Find Your Helper" panel and the
 * Contact page "Send us your details" panel use the same shape, just
 * different copy). Client Component because it needs an onSubmit
 * handler — presentational only for Phase 0, no submission endpoint
 * yet. Will post to /api/enquiries in a later phase.
 */
export default function EnquiryForm({ heading, selectLabel, selectOptions, submitLabel, altHref }: EnquiryFormProps) {
  return (
    <form className="form-card" onSubmit={(e) => e.preventDefault()}>
      <h3>{heading}</h3>
      <div className="field">
        <label htmlFor="f-name">Your name</label>
        <input id="f-name" type="text" placeholder="Jane Tan" />
      </div>
      <div className="field">
        <label htmlFor="f-phone">Mobile / WhatsApp number</label>
        <input id="f-phone" type="tel" placeholder="+65 9123 4567" />
      </div>
      <div className="field">
        <label htmlFor="f-select">{selectLabel}</label>
        <select id="f-select" defaultValue="">
          <option value="">Select…</option>
          {selectOptions.map((opt) => (
            <option key={opt}>{opt}</option>
          ))}
        </select>
      </div>
      <div className="field">
        <label htmlFor="f-msg">Anything we should know? (optional)</label>
        <textarea id="f-msg" placeholder="Tell us about your household routine…" />
      </div>
      <button className="btn btn--primary btn--block" type="submit">{submitLabel}</button>
      <p className="form-alt">
        or <a href={altHref}>WhatsApp an expert now</a>
      </p>
    </form>
  );
}
