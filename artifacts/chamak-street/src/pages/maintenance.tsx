import { motion } from "framer-motion";
import { Wrench, Clock } from "lucide-react";

export default function MaintenancePage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6" style={{ background: "#050505" }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.92, y: 24 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        className="text-center max-w-md space-y-8"
      >
        {/* Animated icon */}
        <div className="relative mx-auto w-20 h-20">
          <motion.div
            animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, repeatDelay: 1.5 }}
            className="w-20 h-20 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #ff6600 0%, #ffcc00 100%)" }}
          >
            <Wrench className="h-10 w-10 text-white" strokeWidth={2.5} />
          </motion.div>
          {/* Orbit dot */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0"
            style={{ transformOrigin: "center" }}
          >
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-yellow-400 shadow-[0_0_8px_#facc15]" />
          </motion.div>
        </div>

        <div className="space-y-3">
          <motion.h1
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
            className="text-4xl font-black uppercase tracking-tighter"
            style={{ background: "linear-gradient(135deg, #ff6600, #ffcc00)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}
          >
            We'll Be Back
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            className="text-white/60 text-base font-medium leading-relaxed"
          >
            FirstPick is currently undergoing maintenance.
            We're working hard to get things back online for you.
          </motion.p>
        </div>

        {/* Progress pulse */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.35 }}
          className="flex items-center justify-center gap-3 text-sm text-white/40 font-bold uppercase tracking-widest"
        >
          <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.6, repeat: Infinity }}>
            <Clock className="h-4 w-4" />
          </motion.div>
          <span>Check back soon</span>
        </motion.div>

        {/* Animated bar */}
        <div className="h-0.5 w-full rounded-full overflow-hidden bg-white/[0.06]">
          <motion.div
            animate={{ x: ["-100%", "100%"] }}
            transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            className="h-full w-1/2 rounded-full"
            style={{ background: "linear-gradient(90deg, transparent, #ff6600, transparent)" }}
          />
        </div>
      </motion.div>
    </div>
  );
}
