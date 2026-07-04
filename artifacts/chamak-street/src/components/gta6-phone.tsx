import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PINK = "#ff2d9c";
const CYAN = "#00d4ff";
const GOLD = "#ffd060";

type PhoneScreen = "locked" | "home" | "contacts" | "maps" | "music" | "messages" | "call-incoming" | "call-active" | "call-ended";

const APPS = [
  { id: "contacts", icon: "👤", label: "Contacts", color: "#2ecc71" },
  { id: "maps",     icon: "🗺️",  label: "Maps",     color: CYAN     },
  { id: "messages", icon: "💬",  label: "Messages", color: PINK     },
  { id: "music",    icon: "🎵",  label: "Music",    color: GOLD     },
  { id: "camera",   icon: "📷",  label: "Camera",   color: "#8e44ad" },
  { id: "gallery",  icon: "🖼️",  label: "Gallery",  color: "#e67e22" },
  { id: "settings", icon: "⚙️",  label: "Settings", color: "#7f8c8d" },
  { id: "wanted",   icon: "⭐",  label: "Wanted",   color: "#e74c3c" },
];

function usePhoneClock() {
  const [time, setTime] = useState(() => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  });
  useEffect(() => {
    const t = setInterval(() => {
      const d = new Date();
      setTime(`${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`);
    }, 10000);
    return () => clearInterval(t);
  }, []);
  return time;
}

interface PhoneProps {
  onClose: () => void;
  triggerCall?: boolean;
}

export function GTA6Phone({ onClose, triggerCall = false }: PhoneProps) {
  const [screen, setScreen] = useState<PhoneScreen>("locked");
  const [callTimer, setCallTimer] = useState(0);
  const callRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const time = usePhoneClock();

  useEffect(() => {
    const t = setTimeout(() => setScreen(triggerCall ? "call-incoming" : "home"), 400);
    return () => clearTimeout(t);
  }, [triggerCall]);

  useEffect(() => {
    if (screen === "call-active") {
      callRef.current = setInterval(() => setCallTimer(c => c + 1), 1000);
    } else {
      if (callRef.current) clearInterval(callRef.current);
      if (screen !== "call-active") setCallTimer(0);
    }
    return () => { if (callRef.current) clearInterval(callRef.current); };
  }, [screen]);

  const formatTimer = (s: number) => `${String(Math.floor(s/60)).padStart(2,"0")}:${String(s%60).padStart(2,"0")}`;

  const SCREEN_BG = "linear-gradient(160deg, #0a1020 0%, #0d1835 50%, #080c20 100%)";

  return (
    <motion.div
      className="flex flex-col items-center justify-end pb-4"
      initial={{ y: 60, opacity: 0, scale: 0.9 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 80, opacity: 0, scale: 0.88 }}
      transition={{ type: "spring", stiffness: 360, damping: 30 }}
    >
      {/* Phone frame */}
      <div
        className="relative rounded-[2.5rem] overflow-hidden shadow-2xl"
        style={{
          width: 260,
          height: 520,
          background: "#0a0d18",
          border: "2px solid rgba(255,255,255,0.12)",
          boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 60px ${PINK}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
        }}
      >
        {/* Notch */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-20"
          style={{ width: 80, height: 22, background: "#0a0d18", borderRadius: "0 0 16px 16px" }} />

        {/* Screen */}
        <div className="absolute inset-0 flex flex-col" style={{ background: SCREEN_BG }}>

          {/* Status bar */}
          <div className="flex justify-between items-center px-5 pt-5 pb-1" style={{ zIndex: 10 }}>
            <span className="text-[9px] text-white/60 font-bold">{time}</span>
            <div className="flex gap-1 items-center">
              <span className="text-[8px] text-white/50">●●●●</span>
              <span className="text-[8px] text-white/50">WiFi</span>
              <span className="text-[8px] text-white/60">🔋</span>
            </div>
          </div>

          {/* Screen content */}
          <AnimatePresence mode="wait">
            {screen === "locked" && (
              <motion.div key="locked"
                className="flex-1 flex flex-col items-center justify-center gap-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-5xl font-black text-white tracking-tight">{time}</div>
                <p className="text-white/40 text-[10px] uppercase tracking-widest">Slide to unlock</p>
                <motion.button
                  onClick={() => setScreen("home")}
                  whileTap={{ scale: 0.96 }}
                  className="mt-4 px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                  style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  Unlock
                </motion.button>
              </motion.div>
            )}

            {screen === "home" && (
              <motion.div key="home"
                className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>

                {/* Wallpaper overlay */}
                <div className="flex-1 relative px-4 pt-2">
                  {/* GTA VI branding */}
                  <div className="text-center mb-4">
                    <span className="text-[8px] font-black uppercase tracking-[0.35em]"
                      style={{ color: PINK, textShadow: `0 0 10px ${PINK}` }}>GTA VI</span>
                    <div className="text-xs text-white/30 mt-0.5">State of Leonida</div>
                  </div>

                  {/* App grid */}
                  <div className="grid grid-cols-4 gap-3">
                    {APPS.map(app => (
                      <motion.button
                        key={app.id}
                        onClick={() => setScreen(app.id as PhoneScreen)}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.92 }}
                        className="flex flex-col items-center gap-1"
                      >
                        <div className="w-11 h-11 rounded-xl flex items-center justify-center text-lg"
                          style={{
                            background: `linear-gradient(145deg, ${app.color}cc, ${app.color}66)`,
                            boxShadow: `0 4px 12px ${app.color}44`,
                          }}>
                          {app.icon}
                        </div>
                        <span className="text-[7px] text-white/60 font-medium">{app.label}</span>
                      </motion.button>
                    ))}
                  </div>

                  {/* Notification */}
                  <div className="mt-4 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎮</span>
                      <div>
                        <p className="text-[9px] font-black text-white">Chamak Street</p>
                        <p className="text-[8px] text-white/50">Welcome to Vice City, bro.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dock */}
                <div className="mx-4 mb-3 rounded-2xl px-4 py-2 flex justify-around"
                  style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)" }}>
                  {["📞","📧","🌐","📷"].map((icon, i) => (
                    <button key={i} className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: "rgba(255,255,255,0.08)" }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* App screens */}
            {["contacts","maps","messages","music","camera","gallery","settings","wanted"].includes(screen) && (
              <motion.div key={screen}
                className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <div className="flex items-center gap-2 px-4 py-2">
                  <button onClick={() => setScreen("home")}
                    className="text-white/50 hover:text-white/80 transition-colors text-xs">← Back</button>
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">
                    {APPS.find(a => a.id === screen)?.label}
                  </span>
                </div>
                <div className="flex-1 flex flex-col items-center justify-center gap-3 px-6">
                  <span className="text-4xl">{APPS.find(a => a.id === screen)?.icon}</span>
                  <p className="text-[10px] text-white/30 text-center uppercase tracking-widest">
                    {screen === "maps" ? "Vice City, Leonida" :
                     screen === "contacts" ? "Jason • Lucia • Trevor" :
                     screen === "music" ? "Vice City Nights Radio" :
                     screen === "messages" ? "Stay low. Get money." :
                     "Coming soon"}
                  </p>
                </div>
              </motion.div>
            )}

            {/* Incoming Call */}
            {screen === "call-incoming" && (
              <motion.div key="call-incoming"
                className="flex-1 flex flex-col items-center pt-6 pb-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>

                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-4">Incoming Call</div>

                {/* Avatar with ring animation */}
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="relative mb-4"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20 relative"
                    style={{ boxShadow: `0 0 0 6px ${CYAN}20, 0 0 0 12px ${CYAN}10` }}>
                    <div className="w-full h-full flex items-center justify-center text-4xl"
                      style={{ background: `linear-gradient(135deg, ${CYAN}30, ${PINK}30)` }}>
                      🎮
                    </div>
                  </div>
                  {[0,1,2].map(i => (
                    <motion.div key={i}
                      className="absolute inset-0 rounded-full border border-white/20"
                      animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }}
                    />
                  ))}
                </motion.div>

                <p className="text-white font-black text-base tracking-wide mb-1">Chamak Street</p>
                <p className="text-white/40 text-[10px] mb-1">+971 00 000 0000</p>
                <p className="text-white/25 text-[9px] uppercase tracking-widest mb-6">Vice City, Leonida</p>

                {/* Ringtone wave */}
                <div className="flex items-end gap-0.5 h-5 mb-6">
                  {Array.from({length: 16}, (_, i) => (
                    <div key={i} className="w-1 rounded-full"
                      style={{
                        background: CYAN,
                        animation: `eqBounce ${0.4 + (i % 4) * 0.1}s ${i * 0.05}s ease-in-out infinite alternate`,
                        height: `${30 + Math.abs(Math.sin(i)) * 70}%`,
                      }} />
                  ))}
                </div>

                {/* Answer / Decline */}
                <div className="flex gap-10 mt-auto px-6">
                  <motion.button
                    onClick={() => setScreen("call-ended")}
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: "#e74c3c", boxShadow: "0 4px 20px #e74c3c66" }}>
                      📵
                    </div>
                    <span className="text-[8px] text-white/40 uppercase tracking-widest">Decline</span>
                  </motion.button>

                  <motion.button
                    onClick={() => setScreen("call-active")}
                    whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1.5"
                  >
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: "#2ecc71", boxShadow: "0 4px 20px #2ecc7166" }}>
                      📞
                    </div>
                    <span className="text-[8px] text-white/40 uppercase tracking-widest">Answer</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Active Call */}
            {screen === "call-active" && (
              <motion.div key="call-active"
                className="flex-1 flex flex-col items-center pt-8 pb-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-[9px] text-white/40 uppercase tracking-widest mb-2">Connected</div>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3"
                  style={{ background: `linear-gradient(135deg, ${CYAN}30, ${PINK}30)`, border: `1px solid ${CYAN}40` }}>
                  🎮
                </div>
                <p className="text-white font-black text-sm">Chamak Street</p>
                <p className="text-white/40 text-xs mt-1 font-mono">{formatTimer(callTimer)}</p>

                {/* Voice wave */}
                <div className="flex items-center gap-0.5 h-8 my-4">
                  {Array.from({length: 20}, (_, i) => (
                    <div key={i} className="w-0.5 rounded-full"
                      style={{
                        background: `linear-gradient(to top, ${CYAN}, ${PINK})`,
                        animation: `eqBounce ${0.3 + (i % 5) * 0.1}s ${i * 0.04}s ease-in-out infinite alternate`,
                        height: `${20 + Math.abs(Math.sin(i * 0.8)) * 80}%`,
                      }} />
                  ))}
                </div>

                <div className="rounded-xl px-4 py-3 text-center mx-4 mb-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-white/60 text-[9px] leading-relaxed italic">
                    "Hello there! Welcome to our website. The new update just came out. Thank you for visiting!"
                  </p>
                </div>

                <motion.button
                  onClick={() => setScreen("call-ended")}
                  whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mt-auto"
                  style={{ background: "#e74c3c", boxShadow: "0 4px 20px #e74c3c66" }}>
                  📵
                </motion.button>
                <span className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5">End Call</span>
              </motion.div>
            )}

            {/* Call Ended */}
            {screen === "call-ended" && (
              <motion.div key="call-ended"
                className="flex-1 flex flex-col items-center justify-center gap-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="text-4xl">👋</span>
                <p className="text-white/60 text-[10px] uppercase tracking-widest">Call Ended</p>
                <motion.button
                  onClick={() => setScreen("home")}
                  whileTap={{ scale: 0.96 }}
                  className="mt-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                  style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})` }}>
                  Home
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Home indicator bar */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full bg-white/20" />
      </div>

      <style>{`
        @keyframes eqBounce { from { transform: scaleY(0.3); } to { transform: scaleY(1); } }
      `}</style>
    </motion.div>
  );
}

export function GTA6PhoneButton({ onOpen }: { onOpen: () => void }) {
  return (
    <motion.button
      onClick={onOpen}
      whileHover={{ scale: 1.08, y: -2 }}
      whileTap={{ scale: 0.94 }}
      className="flex items-center gap-2 px-3 py-2.5 rounded-full font-black text-xs text-white"
      style={{
        background: "rgba(7,7,28,0.85)",
        backdropFilter: "blur(16px)",
        border: "1px solid rgba(255,255,255,0.15)",
        boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
      }}
    >
      <span className="text-sm">📱</span>
      <span className="uppercase tracking-widest text-[9px]">Phone</span>
    </motion.button>
  );
}
