"use client";

import { useEffect, useRef, useState } from "react";
import { UPLOAD_TOTAL_MAX_BYTES, UPLOAD_TOTAL_MAX_LABEL, formatMegabytes } from "@/lib/upload-limits";

/**
 * Browser-side size check for the Add/Edit Maid form's two file inputs.
 *
 * Why it exists: the photo and PDF are submitted together in one request, and a request over
 * the size ceiling (lib/upload-limits.ts) is rejected by the platform before any of our code
 * runs — the only symptom is a bare "ERROR …@E394" page. This catches it first, in the
 * browser, with a message that says what to do, and stops the submit so nothing typed is
 * lost. The server still enforces its own per-file limits independently; this is the friendly
 * layer in front of a hard limit, not a replacement for it.
 *
 * Renders nothing unless there is a problem. It finds the inputs by id (#photo,
 * #biodataPdf) within its own <form>.
 */
export default function UploadSizeGuard() {
  const anchorRef = useRef<HTMLDivElement>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    const form = anchorRef.current?.closest("form");
    if (!form) return;
    const photo = form.querySelector<HTMLInputElement>("#photo");
    const pdf = form.querySelector<HTMLInputElement>("#biodataPdf");

    // Returns true when the selection fits; updates the message either way.
    function check(): boolean {
      const total = (photo?.files?.[0]?.size ?? 0) + (pdf?.files?.[0]?.size ?? 0);
      if (total <= UPLOAD_TOTAL_MAX_BYTES) {
        setProblem(null);
        return true;
      }
      setProblem(
        `The selected photo and PDF add up to ${formatMegabytes(total)}, but only ${UPLOAD_TOTAL_MAX_LABEL} can be saved at once. ` +
          "Either compress the PDF or use a smaller photo, or save the maid with one file now and add the other afterwards from Edit."
      );
      return false;
    }

    function onSubmit(event: Event) {
      if (!check()) {
        event.preventDefault();
        anchorRef.current?.scrollIntoView({ block: "center", behavior: "smooth" });
      }
    }

    photo?.addEventListener("change", check);
    pdf?.addEventListener("change", check);
    form.addEventListener("submit", onSubmit);
    return () => {
      photo?.removeEventListener("change", check);
      pdf?.removeEventListener("change", check);
      form.removeEventListener("submit", onSubmit);
    };
  }, []);

  return (
    <div ref={anchorRef} role="alert" aria-live="polite">
      {problem && <p className="form-notice form-notice--error">{problem}</p>}
    </div>
  );
}
