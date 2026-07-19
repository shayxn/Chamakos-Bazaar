import { useEffect, useRef } from "react";

function getDeviceInfo() {
  const ua = navigator.userAgent;
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(ua);
  const deviceType = isTablet ? "tablet" : isMobile ? "mobile" : "desktop";

  let deviceOs = "Unknown";
  if (/Windows/i.test(ua)) deviceOs = "Windows";
  else if (/Mac OS X/i.test(ua)) deviceOs = "macOS";
  else if (/Android/i.test(ua)) deviceOs = "Android";
  else if (/iPhone|iPad|iPod/i.test(ua)) deviceOs = "iOS";
  else if (/Linux/i.test(ua)) deviceOs = "Linux";

  let browser = "Unknown";
  if (/Chrome\/(?!.*Chromium)(?!.*Edg)/i.test(ua)) browser = "Chrome";
  else if (/Firefox/i.test(ua)) browser = "Firefox";
  else if (/Safari(?!.*Chrome)/i.test(ua)) browser = "Safari";
  else if (/Edg/i.test(ua)) browser = "Edge";
  else if (/OPR|Opera/i.test(ua)) browser = "Opera";

  return { deviceType, deviceOs, browser };
}

function getOrCreateSessionId(): string {
  const key = "chamak_vsid";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

const BASE = import.meta.env.BASE_URL ?? "/";

let _initialPingSent = false;

async function sendTracking(payload: Record<string, unknown>) {
  try {
    await fetch(`${BASE}api/visitor-sessions/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {}
}

export function useVisitorTracking() {
  const eventsRef = useRef<{ type: string; label: string; ts: number }[]>([]);
  const startRef = useRef(Date.now());
  const sessionId = useRef(getOrCreateSessionId());
  const sent = useRef(false);

  useEffect(() => {
    if (!_initialPingSent) {
      _initialPingSent = true;
      const { deviceType, deviceOs, browser } = getDeviceInfo();
      sendTracking({
        sessionId: sessionId.current,
        deviceType,
        deviceOs,
        browser,
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        referrer: document.referrer || null,
        entryPage: window.location.pathname,
        events: JSON.stringify([]),
        durationSeconds: 0,
      });
    }

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const label =
        target.closest("a")?.getAttribute("href") ||
        target.closest("button")?.textContent?.trim().slice(0, 40) ||
        target.textContent?.trim().slice(0, 40) ||
        target.tagName;
      eventsRef.current.push({ type: "click", label: label ?? "", ts: Date.now() });
    };

    const handleNav = () => {
      eventsRef.current.push({ type: "navigate", label: window.location.pathname, ts: Date.now() });
    };

    document.addEventListener("click", handleClick, { passive: true });
    window.addEventListener("popstate", handleNav, { passive: true });

    const flush = () => {
      if (sent.current) return;
      sent.current = true;
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      sendTracking({
        sessionId: sessionId.current,
        events: JSON.stringify(eventsRef.current.slice(-80)),
        durationSeconds: duration,
      });
    };

    const interval = setInterval(() => {
      sent.current = false;
      flush();
    }, 30_000);

    const onHide = () => { if (document.visibilityState === "hidden") { sent.current = false; flush(); } };
    const onUnload = () => { sent.current = false; flush(); };

    document.addEventListener("visibilitychange", onHide);
    window.addEventListener("beforeunload", onUnload);
    window.addEventListener("pagehide", onUnload);

    return () => {
      document.removeEventListener("click", handleClick);
      window.removeEventListener("popstate", handleNav);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", onUnload);
      window.removeEventListener("pagehide", onUnload);
      clearInterval(interval);
    };
  }, []);
}
