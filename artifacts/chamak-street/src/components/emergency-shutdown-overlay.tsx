import { motion, useReducedMotion } from "framer-motion";
import { useLocation } from "wouter";
import { getGetMeQueryKey, useGetMe } from "@workspace/api-client-react";
import { useOperationalSettings } from "@/lib/use-settings";

/**
 * A customer-only, reversible safety layer. The server remains online so Admin
 * can immediately turn it off, while customer interactions are blocked.
 */
export function EmergencyShutdownOverlay() {
  const [location] = useLocation();
  const reduceMotion = useReducedMotion();
  const isProtectedRoute = location.startsWith("/admin") || location.startsWith("/login");
  const { data: user } = useGetMe({
    query: { queryKey: getGetMeQueryKey(), retry: false, staleTime: 60_000 },
  });
  const { emergencyShutdown } = useOperationalSettings();

  if (isProtectedRoute || user?.isAdmin || !emergencyShutdown) {
    return null;
  }

  return (
    <motion.div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="emergency-shutdown-title"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={reduceMotion ? { duration: 0 } : { duration: 0.42, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-0 z-[9000] flex items-center justify-center overflow-hidden bg-black/80 px-5 text-center text-white backdrop-blur-[3px]"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(255,117,0,0.16),transparent_42%)]" />
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, y: 14, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={reduceMotion ? { duration: 0 } : { delay: 0.1, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="relative max-w-xl"
      >
        <p className="mb-5 text-[10px] font-black uppercase tracking-[0.42em] text-violet-200/85">
          IMAGINATE is temporarily paused
        </p>
        <h1
          id="emergency-shutdown-title"
          className="text-balance text-[clamp(3rem,11vw,6.8rem)] font-black uppercase leading-[0.84] tracking-[-0.085em] text-white"
          style={{ fontFamily: "'Arial Black', 'Impact', 'Franklin Gothic Heavy', sans-serif" }}
        >
          We&apos;ll Be
          <br />
          <span className="bg-gradient-to-b from-orange-300 to-orange-500 bg-clip-text text-transparent">Back Soon!</span>
        </h1>
        <div className="mt-8 flex items-center justify-center gap-3 text-3xl sm:text-4xl" aria-label="Maintenance in progress">
          <span>⚠️</span>
          <span>🔧</span>
          <span>🚧</span>
        </div>
        <p className="mx-auto mt-6 max-w-sm text-sm leading-relaxed text-white/60">
          We&apos;re making a quick improvement. Please check back in a little while.
        </p>
      </motion.div>
    </motion.div>
  );
}