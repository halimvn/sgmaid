"use client";

import { useEffect, useState } from "react";

const POLL_MS = 15_000;

/**
 * "N employers viewing biodata right now" — shown on the admin and employer dashboards.
 * Starts from the count the server rendered, then refreshes every 15 seconds while the tab is
 * visible (and immediately when it becomes visible again).
 */
export default function LiveViewersPill({ initialCount }: { initialCount: number }) {
  const [count, setCount] = useState(initialCount);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setInterval> | undefined;

    async function refresh() {
      try {
        const res = await fetch("/api/presence/biodata", { cache: "no-store" });
        if (!res.ok) return;
        const data: { count?: number } = await res.json();
        if (!cancelled && typeof data.count === "number") setCount(data.count);
      } catch {
        /* keep showing the last known number */
      }
    }
    const start = () => {
      if (timer) return;
      timer = setInterval(refresh, POLL_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refresh();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  return (
    <div className="live-pill" role="status" aria-live="polite">
      <span className="live-pill__dot" aria-hidden="true" />
      <svg className="live-pill__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="9" cy="8" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M3.5 19c.4-3.2 2.7-5 5.5-5s5.1 1.8 5.5 5" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.4" fill="none" stroke="currentColor" strokeWidth="1.7" />
        <path d="M16.5 14.2c2.3.1 4 1.6 4.4 4.3" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
      </svg>
      <span className="live-pill__count">{count}</span>
      <span className="live-pill__label">{count === 1 ? "Employer" : "Employers"} viewing biodata right now</span>
    </div>
  );
}
