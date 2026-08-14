/**
 * FirstPick — Visitor Tracking
 *
 * Provides:
 *  • useVisitorTracking() hook — call once at app root to initialise tracking
 *  • Exported singleton functions callable by any component:
 *      trackSearch(query)
 *      trackCartUpdate(count, value)
 *      trackCheckout()
 *      trackOrder(orderNumber)
 *      setCustomerLogin(email | null)
 */

import { useEffect, useRef } from "react";

const SESSION_KEY = "chamak_vsid";
const BASE = (import.meta.env.BASE_URL ?? "/").replace(/\/$/, "");

// ── Singleton state ──────────────────────────────────────────────────────────
let _sessionId = "";
let _initialized = false;

function getOrCreateSessionId(): string {
  if (_sessionId) return _sessionId;
  try {
    const stored = sessionStorage.getItem(SESSION_KEY);
    if (stored) { _sessionId = stored; return _sessionId; }
    _sessionId = `vs_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    sessionStorage.setItem(SESSION_KEY, _sessionId);
  } catch { _sessionId = `vs_${Date.now()}_x`; }
  return _sessionId;
}

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

async function send(payload: Record<string, unknown>) {
  try {
    await fetch(`${BASE}/api/visitor-sessions/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    });
  } catch {}
}

// ── Public API ───────────────────────────────────────────────────────────────

/** Call when the user performs a search (debounce before calling). */
export function trackSearch(query: string) {
  if (!query || query.trim().length < 2) return;
  const sid = getOrCreateSessionId();
  const event = { type: "search", label: `Searched "${query.trim()}"`, ts: Date.now() };
  send({ sessionId: sid, searchQuery: query.trim(), activityEvent: event, eventType: "search" });
}

/** Call whenever cart item count or total changes. */
export function trackCartUpdate(count: number, value: number) {
  const sid = getOrCreateSessionId();
  const label = count > 0
    ? `Cart: ${count} item${count !== 1 ? "s" : ""} · AED ${value.toFixed(0)}`
    : "Cart emptied";
  const event = { type: "cart", label, ts: Date.now() };
  send({ sessionId: sid, cartCount: count, cartValue: value, activityEvent: event, eventType: "cart_add" });
}

/** Call when the customer lands on / starts the checkout page. */
export function trackCheckout() {
  const sid = getOrCreateSessionId();
  const event = { type: "checkout", label: "Started checkout", ts: Date.now() };
  send({ sessionId: sid, checkoutStarted: true, activityEvent: event, eventType: "checkout" });
}

/** Call after a successful order. */
export function trackOrder(orderNumber: string) {
  const sid = getOrCreateSessionId();
  const event = { type: "order", label: `Order ${orderNumber} completed`, ts: Date.now() };
  send({ sessionId: sid, orderCompleted: orderNumber, activityEvent: event });
}

/** Call when the customer logs in or out. Pass null when logging out. */
export function setCustomerLogin(email: string | null) {
  const sid = getOrCreateSessionId();
  const event = email
    ? { type: "login", label: `Signed in as ${email}`, ts: Date.now() }
    : { type: "logout", label: "Signed out", ts: Date.now() };
  send({ sessionId: sid, isLoggedIn: email !== null, customerEmail: email, activityEvent: event });
}

// ── Hook (initialises tracking, heartbeat, page tracking) ───────────────────
export function useVisitorTracking() {
  const startRef = useRef(Date.now());
  const sessionId = useRef(getOrCreateSessionId());

  useEffect(() => {
    if (_initialized) return;
    _initialized = true;

    const { deviceType, deviceOs, browser } = getDeviceInfo();
    const currentPage = window.location.pathname;
    const initEvent = { type: "visit", label: `Entered ${currentPage}`, ts: Date.now() };

    // Initial ping — creates or updates session
    send({
      sessionId: sessionId.current,
      deviceType,
      deviceOs,
      browser,
      screenWidth: window.screen.width,
      screenHeight: window.screen.height,
      referrer: document.referrer || null,
      entryPage: currentPage,
      currentPage,
      events: JSON.stringify([]),
      durationSeconds: 0,
      activityEvent: initEvent,
      eventType: "visit",
    });
  }, []);

  useEffect(() => {
    // Patch history.pushState so SPA navigations fire locationchange
    if (!(window as any).__fpPatched) {
      (window as any).__fpPatched = true;
      const orig = history.pushState.bind(history);
      history.pushState = function (...args) {
        orig(...args);
        window.dispatchEvent(new Event("locationchange"));
      };
    }

    const trackPage = () => {
      const page = window.location.pathname;
      const event = { type: "page", label: `Viewed ${page}`, ts: Date.now() };
      send({ sessionId: sessionId.current, currentPage: page, activityEvent: event });
    };

    // Duration heartbeat every 30s + update current page
    const flush = () => {
      const duration = Math.round((Date.now() - startRef.current) / 1000);
      send({
        sessionId: sessionId.current,
        durationSeconds: duration,
        currentPage: window.location.pathname,
      });
    };
    const interval = setInterval(flush, 30_000);

    const onNav = () => trackPage();
    const onHide = () => { if (document.visibilityState === "hidden") flush(); };

    window.addEventListener("locationchange", onNav, { passive: true });
    window.addEventListener("popstate", onNav, { passive: true });
    document.addEventListener("visibilitychange", onHide, { passive: true });
    window.addEventListener("beforeunload", flush);
    window.addEventListener("pagehide", flush);

    return () => {
      clearInterval(interval);
      window.removeEventListener("locationchange", onNav);
      window.removeEventListener("popstate", onNav);
      document.removeEventListener("visibilitychange", onHide);
      window.removeEventListener("beforeunload", flush);
      window.removeEventListener("pagehide", flush);
    };
  }, []);
}
