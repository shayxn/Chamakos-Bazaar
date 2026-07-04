import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PINK = "#ff2d9c";
const CYAN = "#00d4ff";

const STATIONS = [
  {
    id: "nights",
    name: "Vice City Nights",
    emoji: "🌴",
    color: CYAN,
    desc: "Synthwave & 80s neon",
    streamUrl: "https://ice6.somafm.com/synphaera-128-aac",
    genre: "Synth / Ambient Electronic",
    songs: [
      { title: "Neon Lights", artist: "Synphaera Radio", duration: "LIVE", emoji: "💙" },
      { title: "Vice City Drive", artist: "Synthwave FM", duration: "LIVE", emoji: "🌊" },
      { title: "Midnight Cruiser", artist: "Neon Radio", duration: "LIVE", emoji: "🌙" },
      { title: "Electric Dreams", artist: "Cyber Station", duration: "LIVE", emoji: "⚡" },
    ],
  },
  {
    id: "beach",
    name: "Beach FM",
    emoji: "🏖️",
    color: "#00e5cc",
    desc: "Chill & tropical vibes",
    streamUrl: "https://ice6.somafm.com/groovesalad-128-aac",
    genre: "Groove Salad · Chill",
    songs: [
      { title: "Palm Tree Sessions", artist: "Groove Salad", duration: "LIVE", emoji: "🌴" },
      { title: "Ocean Breeze Mix", artist: "Chill Radio", duration: "LIVE", emoji: "🌊" },
      { title: "Sunset Lounge", artist: "Ambient FM", duration: "LIVE", emoji: "🌅" },
      { title: "Coconut Radio", artist: "Lounge Radio", duration: "LIVE", emoji: "🥥" },
    ],
  },
  {
    id: "ocean",
    name: "Ocean Drive",
    emoji: "🌊",
    color: "#0099ff",
    desc: "Deep electronic & fluid",
    streamUrl: "https://ice6.somafm.com/fluid-128-aac",
    genre: "Fluid · Deep Electronic",
    songs: [
      { title: "Deep Blue Sessions", artist: "Fluid Radio", duration: "LIVE", emoji: "💧" },
      { title: "Underwater World", artist: "Deep FM", duration: "LIVE", emoji: "🐠" },
      { title: "Oceanic Beats", artist: "Wave Radio", duration: "LIVE", emoji: "🌊" },
      { title: "Submarine Dreams", artist: "Fluid Station", duration: "LIVE", emoji: "🚢" },
    ],
  },
  {
    id: "highway",
    name: "Highway 1 Radio",
    emoji: "🚗",
    color: "#ff8c00",
    desc: "Lounge & retro spy vibes",
    streamUrl: "https://ice6.somafm.com/secretagent-128-aac",
    genre: "Secret Agent · Spy Jazz",
    songs: [
      { title: "Secret Agent Radio", artist: "SomaFM", duration: "LIVE", emoji: "🕵️" },
      { title: "Highway Cruiser", artist: "Retro FM", duration: "LIVE", emoji: "🚗" },
      { title: "Palm Springs Drive", artist: "Lounge Radio", duration: "LIVE", emoji: "🌴" },
      { title: "Vegas Highway", artist: "Retro Spy FM", duration: "LIVE", emoji: "🎰" },
    ],
  },
  {
    id: "trap",
    name: "Leonida Trap",
    emoji: "🎤",
    color: PINK,
    desc: "Heavy bass & hip-hop",
    streamUrl: "https://ice6.somafm.com/sonicuniverse-128-aac",
    genre: "Sonic Universe · Jazz Fusion",
    songs: [
      { title: "Leonida Sessions", artist: "Sonic Universe", duration: "LIVE", emoji: "🎵" },
      { title: "Vice City Flex", artist: "Bass Radio", duration: "LIVE", emoji: "💎" },
      { title: "Night Riders", artist: "Trap FM", duration: "LIVE", emoji: "🌙" },
      { title: "Glitched Out", artist: "Bass Station", duration: "LIVE", emoji: "🎹" },
    ],
  },
  {
    id: "hiphop",
    name: "Vice City Radio",
    emoji: "📻",
    color: "#ff8c00",
    desc: "Eclectic & trippy tunes",
    streamUrl: "https://ice6.somafm.com/thetrip-128-aac",
    genre: "The Trip · Psychedelic",
    songs: [
      { title: "Vice City Classics", artist: "The Trip", duration: "LIVE", emoji: "🎤" },
      { title: "Old School Flex", artist: "Eclectic FM", duration: "LIVE", emoji: "🥂" },
      { title: "Retro Radio Mix", artist: "Trip Station", duration: "LIVE", emoji: "🎵" },
      { title: "Classic Vibes", artist: "Vice Radio", duration: "LIVE", emoji: "🌟" },
    ],
  },
];

type StationId = string | null;

const EQ_BARS = 12;

export function GTA6Radio() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<StationId>(null);
  const [songIndex, setSongIndex] = useState(0);
  const [buffering, setBuffering] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const eqBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const eqFrameRef = useRef<number>(0);
  const songTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = "";
    }
    setBuffering(false);
    setError(false);
  }, []);

  const playStation = useCallback((id: StationId) => {
    stopAll();
    if (!id) { setActive(null); setSongIndex(0); return; }
    const station = STATIONS.find(s => s.id === id);
    if (!station) return;

    if (!audioRef.current) audioRef.current = new Audio();
    const audio = audioRef.current;
    audio.crossOrigin = "anonymous";
    audio.src = station.streamUrl;
    const vol = Math.min(1, Math.max(0, Number(localStorage.getItem("phone_volume") ?? 70) / 100));
    audio.volume = vol * 0.65;
    setBuffering(true);
    setError(false);
    setActive(id);
    setSongIndex(0);

    audio.play()
      .then(() => setBuffering(false))
      .catch(() => { setBuffering(false); setError(true); });

    audio.onwaiting = () => setBuffering(true);
    audio.onplaying = () => setBuffering(false);
    audio.onerror = () => { setBuffering(false); setError(true); };
  }, [stopAll]);

  useEffect(() => {
    if (songTimerRef.current) clearInterval(songTimerRef.current);
    if (!active) return;
    const station = STATIONS.find(s => s.id === active);
    if (!station) return;
    songTimerRef.current = setInterval(() => {
      setSongIndex(prev => (prev + 1) % station.songs.length);
    }, 30_000);
    return () => { if (songTimerRef.current) clearInterval(songTimerRef.current); };
  }, [active]);

  useEffect(() => {
    cancelAnimationFrame(eqFrameRef.current);
    if (!active) {
      eqBarsRef.current.forEach(el => { if (el) el.style.height = "8%"; });
      return;
    }
    let frame = 0;
    const station = STATIONS.find(s => s.id === active);
    const color = station?.color ?? CYAN;
    const tick = () => {
      frame++;
      eqBarsRef.current.forEach((el, i) => {
        if (!el) return;
        const t = frame * 0.05 + i * 0.7;
        const h = buffering
          ? 8 + Math.abs(Math.sin(frame * 0.05 + i * 0.5) * 15)
          : 15 + Math.abs(Math.sin(t * (1 + i * 0.1)) * Math.cos(t * 0.5)) * 75;
        el.style.height = `${h}%`;
        el.style.background = `linear-gradient(to top, ${color}, ${color}60)`;
      });
      eqFrameRef.current = requestAnimationFrame(tick);
    };
    eqFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(eqFrameRef.current);
  }, [active, buffering]);

  useEffect(() => () => {
    stopAll();
    cancelAnimationFrame(eqFrameRef.current);
    if (songTimerRef.current) clearInterval(songTimerRef.current);
  }, [stopAll]);

  const activeStation = STATIONS.find(s => s.id === active);
  const currentSong = activeStation?.songs[songIndex % (activeStation?.songs.length ?? 1)];

  return (
    <div className="fixed bottom-8 left-6 z-[90] flex flex-col items-start gap-2" style={{ pointerEvents: "auto" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="rounded-2xl p-4 w-64 mb-1"
            style={{
              background: "rgba(7,7,28,0.94)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${active ? (activeStation?.color ?? PINK) : "rgba(255,255,255,0.12)"}40`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${active ? (activeStation?.color ?? CYAN) : CYAN}18`,
              maxHeight: "80vh",
              overflowY: "auto",
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/40">Radio</span>
                {active && (
                  <span className="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full"
                    style={{ background: "rgba(0,212,255,0.15)", color: CYAN, border: "1px solid rgba(0,212,255,0.3)" }}>
                    LIVE
                  </span>
                )}
              </div>
              {active && (
                <button
                  onClick={() => { stopAll(); setActive(null); setSongIndex(0); }}
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: activeStation?.color, border: `1px solid ${activeStation?.color}40` }}
                >
                  Stop
                </button>
              )}
            </div>

            {/* EQ */}
            <div className="flex items-end gap-0.5 h-8 mb-3">
              {Array.from({ length: EQ_BARS }).map((_, i) => (
                <div
                  key={i}
                  ref={el => { eqBarsRef.current[i] = el; }}
                  className="flex-1 rounded-sm"
                  style={{ height: "8%", background: "rgba(255,255,255,0.08)" }}
                />
              ))}
            </div>

            {/* Now Playing */}
            {active && currentSong && (
              <div className="mb-3 rounded-xl overflow-hidden" style={{ background: `${activeStation?.color}12`, border: `1px solid ${activeStation?.color}25` }}>
                <div className="flex items-center gap-2 px-2.5 py-2">
                  <span className="text-xl">{currentSong.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-white leading-none truncate">
                      {buffering ? "Connecting…" : error ? "Stream unavailable" : currentSong.title}
                    </p>
                    <p className="text-[8px] text-white/40 mt-0.5 truncate">
                      {error ? "Try another station" : activeStation?.genre}
                    </p>
                  </div>
                  {buffering && (
                    <motion.div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ background: activeStation?.color }}
                      animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
                      transition={{ duration: 0.8, repeat: Infinity }}
                    />
                  )}
                  {!buffering && !error && (
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: activeStation?.color, boxShadow: `0 0 6px ${activeStation?.color}` }} />
                  )}
                </div>
                {/* Animated live indicator bar */}
                {!error && (
                  <div className="h-0.5 mx-2.5 mb-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: activeStation?.color }}
                      animate={buffering ? { width: ["0%", "60%", "0%"] } : { width: ["0%", "100%"] }}
                      transition={buffering
                        ? { duration: 1.2, repeat: Infinity, ease: "easeInOut" }
                        : { duration: 30, ease: "linear", repeat: Infinity }
                      }
                    />
                  </div>
                )}
              </div>
            )}

            {/* Stations */}
            <div className="flex flex-col gap-1.5">
              {STATIONS.map(s => {
                const isPlaying = active === s.id;
                const previewSong = isPlaying ? currentSong : s.songs[0];
                return (
                  <button
                    key={s.id}
                    onClick={() => isPlaying ? (stopAll(), setActive(null), setSongIndex(0)) : playStation(s.id)}
                    className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-200"
                    style={{
                      background: isPlaying ? `${s.color}18` : "rgba(255,255,255,0.04)",
                      border: `1px solid ${isPlaying ? s.color + "50" : "rgba(255,255,255,0.06)"}`,
                    }}
                  >
                    <span className="text-sm">{s.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-wider truncate"
                        style={{ color: isPlaying ? s.color : "rgba(255,255,255,0.8)" }}>{s.name}</p>
                      <p className="text-[8px] text-white/30 truncate">{s.desc}</p>
                    </div>
                    {isPlaying && !buffering && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                    )}
                    {isPlaying && buffering && (
                      <motion.div
                        className="w-1.5 h-1.5 rounded-full shrink-0"
                        style={{ background: s.color }}
                        animate={{ scale: [1, 1.5, 1], opacity: [1, 0.4, 1] }}
                        transition={{ duration: 0.7, repeat: Infinity }}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Attribution */}
            <p className="mt-3 text-[7px] text-white/15 text-center">Streaming via SomaFM · Free internet radio</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toggle button */}
      <motion.button
        onClick={() => setOpen(v => !v)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.94 }}
        className="flex items-center gap-2 px-3 py-2.5 rounded-full font-black text-xs text-white"
        style={{
          background: open
            ? `linear-gradient(135deg, ${active ? (activeStation?.color ?? PINK) : CYAN}, ${active ? (activeStation?.color ?? PINK) : PINK})`
            : "rgba(7,7,28,0.85)",
          backdropFilter: "blur(16px)",
          border: `1px solid ${active ? (activeStation?.color ?? CYAN) + "60" : "rgba(255,255,255,0.15)"}`,
          boxShadow: active ? `0 4px 20px ${activeStation?.color ?? CYAN}40` : "0 4px 20px rgba(0,0,0,0.4)",
        }}
      >
        <RadioIcon active={!!active} color={active ? (activeStation?.color ?? CYAN) : undefined} />
        <span className="uppercase tracking-widest text-[9px]">
          {active
            ? buffering ? `${activeStation?.emoji} Loading…` : `${activeStation?.emoji} On Air`
            : "Radio"}
        </span>
      </motion.button>

      <style>{`@keyframes eqDot { from { height: 4px; } to { height: 12px; } }`}</style>
    </div>
  );
}

function RadioIcon({ active, color }: { active: boolean; color?: string }) {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      {active ? (
        <>
          <rect x="1" y="5" width="2" height="4" rx="1" fill={color ?? "white"}
            style={{ animation: "eqDot 0.4s ease-in-out infinite alternate" }} />
          <rect x="4" y="3" width="2" height="8" rx="1" fill={color ?? "white"}
            style={{ animation: "eqDot 0.6s 0.1s ease-in-out infinite alternate" }} />
          <rect x="7" y="1" width="2" height="12" rx="1" fill={color ?? "white"}
            style={{ animation: "eqDot 0.5s 0.2s ease-in-out infinite alternate" }} />
          <rect x="10" y="3" width="2" height="8" rx="1" fill={color ?? "white"}
            style={{ animation: "eqDot 0.7s 0.05s ease-in-out infinite alternate" }} />
        </>
      ) : (
        <>
          <circle cx="7" cy="7" r="5" stroke="white" strokeWidth="1.2" strokeOpacity="0.7" fill="none" />
          <circle cx="7" cy="7" r="2" fill="white" fillOpacity="0.7" />
          <line x1="7" y1="2" x2="11" y2="1" stroke="white" strokeWidth="1" strokeOpacity="0.5" strokeLinecap="round" />
        </>
      )}
    </svg>
  );
}
