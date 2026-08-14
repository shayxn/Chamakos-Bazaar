import { useState, useEffect } from "react";

/**
 * Detects whether the app is running as an installed PWA (Home Screen / standalone mode).
 *
 * Uses proper PWA APIs — NOT device detection:
 *   - display-mode: standalone  → Chrome / Android / modern Safari
 *   - navigator.standalone       → legacy iOS Safari
 *
 * Returns false during SSR / server rendering.
 */
export function usePwaMode(): boolean {
  const [isStandalone, setIsStandalone] = useState(false);

  useEffect(() => {
    const check = () => {
      const standalone =
        window.matchMedia?.("(display-mode: standalone)").matches === true ||
        (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
      setIsStandalone(standalone);
    };

    check();

    // React to user installing the app mid-session
    const mq = window.matchMedia?.("(display-mode: standalone)");
    mq?.addEventListener("change", check);
    return () => mq?.removeEventListener("change", check);
  }, []);

  return isStandalone;
}
