"use client";

import { useEffect } from "react";

const HEARTBEAT_MS = 20_000;

/**
 * Renders nothing. While an employer has a helper's profile open AND is looking at the tab, it
 * tells the server every 20 seconds, which feeds the dashboards' "employers viewing biodata
 * right now" count (lib/services/presence.ts). It stops when the tab is hidden or closed, so an
 * employer who has walked away stops counting within about 45 seconds.
 */
export default function BiodataPresencePing({ maidId }: { maidId: string }) {
  useEffect(() => {
    const url = "/api/presence/biodata";
    let timer: ReturnType<typeof setInterval> | undefined;

    const ping = () => {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ maidId }),
        keepalive: true,
      }).catch(() => {
        /* offline / signed out: presence is best-effort and must never disturb the page */
      });
    };
    const leave = () => {
      try {
        navigator.sendBeacon(url, new Blob([JSON.stringify({ leave: true })], { type: "application/json" }));
      } catch {
        /* best-effort */
      }
    };
    const start = () => {
      if (timer) return;
      ping();
      timer = setInterval(ping, HEARTBEAT_MS);
    };
    const stop = () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") start();
      else stop();
    };

    if (document.visibilityState === "visible") start();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", leave);
      stop();
      leave();
    };
  }, [maidId]);

  return null;
}
