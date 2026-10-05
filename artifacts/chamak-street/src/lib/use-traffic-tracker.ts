import { useEffect, useRef } from "react";
import { useLocation } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const KEY = "imaginate_visitor_id";

function visitorId(): string {
  try {
    let v = localStorage.getItem(KEY);
    if (!v) { v = crypto.randomUUID(); localStorage.setItem(KEY, v); }
    return v;
  } catch { return crypto.randomUUID(); }
}
function deviceType(): "desktop" | "mobile" | "tablet" {
  const ua = navigator.userAgent;
  if (/iPad|Tablet/i.test(ua) || (/Android/i.test(ua) && !/Mobile/i.test(ua)) || (navigator.maxTouchPoints > 1 && /Macintosh/i.test(ua))) return "tablet";
  return /Mobi|iPhone|Android/i.test(ua) ? "mobile" : "desktop";
}

/** Anonymous public-only heartbeat. Mount once in the customer layout. */
export function useTrafficTracker() {
  const [location] = useLocation();
  const last = useRef<string | null>(null);
  useEffect(() => {
    if (/^\/(?:admin|login)(?:\/|$)/.test(location)) return;
    const send = (pageChanged: boolean) => {
      if (document.visibilityState !== "visible") return;
      void fetch(`${BASE}/api/traffic/track`, {
        method: "POST", credentials: "include", keepalive: true, headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId: visitorId(), page: location, deviceType: deviceType(), pageChanged }),
      }).catch(() => undefined);
    };
    const changed = last.current !== location;
    last.current = location;
    send(changed);
    const t = setInterval(() => send(false), 25_000);
    const vis = () => { if (document.visibilityState === "visible") send(false); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(t); document.removeEventListener("visibilitychange", vis); };
  }, [location]);
}
