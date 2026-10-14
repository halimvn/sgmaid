"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const POLL_MS = 10_000;
const TOAST_MS = 10_000;
const MAX_VISIBLE = 3;

type ShortlistEvent = { id: string; at: string; clientName: string; maidName: string; profileCode: string };
type Toast = ShortlistEvent & { key: string };

/**
 * Small pop-up notification, top right of every admin page, when a client shortlists a helper
 * while the admin is on the dashboard.
 *
 * It lives in the /admin layout, so it keeps running as the admin moves between admin pages.
 * It asks the server every 10 seconds (only while the tab is visible) for shortlists newer than
 * its cursor; the server's own clock supplies the cursor, so nothing depends on this computer's
 * clock. The first call after a page loads only fetches the starting cursor — nothing that
 * happened before the admin opened the page pops up. A pop-up fades after 10 seconds, can be
 * closed, and links to the Shortlists page.
 */
export default function ShortlistNotifier() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const cursor = useRef<string | null>(null);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    let cancelled = false;
    let poller: ReturnType<typeof setInterval> | undefined;
    const pending = timers.current;

    function dismiss(key: string) {
      const t = pending.get(key);
      if (t) clearTimeout(t);
      pending.delete(key);
      setToasts((current) => current.filter((x) => x.key !== key));
    }

    async function poll() {
      try {
        const url = cursor.current ? `/api/admin/shortlist-events?since=${encodeURIComponent(cursor.current)}` : "/api/admin/shortlist-events";
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data: { cursor: string; events: ShortlistEvent[] } = await res.json();
        cursor.current = data.cursor;
        if (data.events.length === 0) return;

        const fresh = data.events.map((e) => ({ ...e, key: `${e.id}-${e.at}` }));
        setToasts((current) => [...current, ...fresh].slice(-MAX_VISIBLE));
        for (const t of fresh) pending.set(t.key, setTimeout(() => dismiss(t.key), TOAST_MS));
      } catch {
        /* offline or signed out: try again on the next tick */
      }
    }

    const start = () => {
      if (poller) return;
      void poll();
      poller = setInterval(poll, POLL_MS);
    };
    const stop = () => {
      if (poller) clearInterval(poller);
      poller = undefined;
    };
    const onVisibility = () => (document.visibilityState === "visible" ? start() : stop());

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      cancelled = true;
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
      pending.forEach(clearTimeout);
      pending.clear();
    };
  }, []);

  function close(key: string) {
    const t = timers.current.get(key);
    if (t) clearTimeout(t);
    timers.current.delete(key);
    setToasts((current) => current.filter((x) => x.key !== key));
  }

  if (toasts.length === 0) return null;

  return (
    <div className="sl-toasts" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div className="sl-toast" key={t.key}>
          <svg className="sl-toast__icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.6-7.5 10.2-7.5 10.2Z" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
          <div className="sl-toast__body">
            <strong>New shortlist</strong>
            <span>
              {t.clientName} shortlisted {t.maidName} ({t.profileCode})
            </span>
            <Link href="/admin/shortlists" onClick={() => close(t.key)}>View shortlists</Link>
          </div>
          <button type="button" className="sl-toast__close" onClick={() => close(t.key)} aria-label="Dismiss notification">
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
