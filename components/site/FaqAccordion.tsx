"use client";

import { useRef } from "react";

type FaqItem = { q: string; a: string };

const FAQS: FaqItem[] = [
  {
    q: "How long does the matching process take?",
    a: "We typically move from the initial interview to deployment within a few weeks, depending on the speed of documentation and embassy endorsements.",
  },
  {
    q: "What is the Maid Loan process?",
    a: "We advance the placement costs so your initial cash flow stays protected, and the loan is repaid gradually via salary deductions over the agreed term.",
  },
  {
    q: "Can I interview candidates online?",
    a: "Yes — we arrange secure, home-based video interviews so you can shortlist and speak with candidates without visiting an office.",
  },
  {
    q: "Do you help with the Employer Orientation Program (EOP)?",
    a: "Yes. Our team guides first-time employers through the EOP requirement along with the rest of the MOM, ICA and embassy paperwork.",
  },
];

/** Single-open FAQ accordion — replaces the old per-page inline <script>. */
export default function FaqAccordion() {
  const ref = useRef<HTMLDivElement>(null);

  function handleToggle(e: React.SyntheticEvent<HTMLDetailsElement>) {
    const opened = e.currentTarget;
    if (!opened.open || !ref.current) return;
    ref.current.querySelectorAll("details").forEach((d) => {
      if (d !== opened) d.removeAttribute("open");
    });
  }

  return (
    <div className="faq" ref={ref}>
      {FAQS.map((item, i) => (
        <details key={item.q} open={i === 0} onToggle={handleToggle}>
          <summary>
            {item.q} <span className="pm">+</span>
          </summary>
          <p>{item.a}</p>
        </details>
      ))}
    </div>
  );
}
