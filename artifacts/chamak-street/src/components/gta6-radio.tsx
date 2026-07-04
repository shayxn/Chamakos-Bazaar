import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PINK = "#ff2d9c";
const CYAN = "#00d4ff";
const GOLD = "#ffd060";

interface Song {
  title: string;
  artist: string;
  duration: string;
  emoji: string;
}

interface Station {
  id: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
  songs: Song[];
}

const STATIONS: Station[] = [
  {
    id: "nights",
    name: "Vice City Nights",
    emoji: "🌆",
    color: PINK,
    desc: "Neon synth & city pulse",
    songs: [
      { title: "Thriller", artist: "Michael Jackson", duration: "5:57", emoji: "🕷️" },
      { title: "Blinding Lights", artist: "The Weeknd", duration: "3:20", emoji: "🌃" },
      { title: "Starboy", artist: "The Weeknd ft. Daft Punk", duration: "3:50", emoji: "⭐" },
      { title: "Save Your Tears", artist: "The Weeknd", duration: "3:35", emoji: "🌹" },
      { title: "Bad Guy", artist: "Billie Eilish", duration: "3:14", emoji: "💚" },
      { title: "Die For You", artist: "The Weeknd", duration: "4:20", emoji: "🥀" },
    ],
  },
  {
    id: "beach",
    name: "Beach FM",
    emoji: "🌴",
    color: CYAN,
    desc: "Waves & tropical breeze",
    songs: [
      { title: "Watermelon Sugar", artist: "Harry Styles", duration: "2:54", emoji: "🍉" },
      { title: "Levitating", artist: "Dua Lipa", duration: "3:23", emoji: "✨" },
      { title: "As It Was", artist: "Harry Styles", duration: "2:37", emoji: "🌅" },
      { title: "Espresso", artist: "Sabrina Carpenter", duration: "2:55", emoji: "☕" },
      { title: "Good as Hell", artist: "Lizzo", duration: "2:39", emoji: "🌸" },
      { title: "Flowers", artist: "Miley Cyrus", duration: "3:21", emoji: "🌺" },
    ],
  },
  {
    id: "ocean",
    name: "Ocean Breeze",
    emoji: "🌊",
    color: "#40c0ff",
    desc: "Deep water & calm",
    songs: [
      { title: "Stay", artist: "Justin Bieber & The Kid LAROI", duration: "2:21", emoji: "💙" },
      { title: "Peaches", artist: "Justin Bieber ft. Daniel Caesar", duration: "3:18", emoji: "🍑" },
      { title: "Ocean Eyes", artist: "Billie Eilish", duration: "3:21", emoji: "👁️" },
      { title: "Adore You", artist: "Harry Styles", duration: "3:27", emoji: "🐟" },
      { title: "Cruel Summer", artist: "Taylor Swift", duration: "2:58", emoji: "☀️" },
      { title: "Creepin'", artist: "Metro Boomin ft. The Weeknd", duration: "3:12", emoji: "🌙" },
    ],
  },
  {
    id: "highway",
    name: "Highway Drive",
    emoji: "🚗",
    color: GOLD,
    desc: "Open road & speed",
    songs: [
      { title: "APT.", artist: "ROSÉ & Bruno Mars", duration: "3:29", emoji: "🌹" },
      { title: "Shape of You", artist: "Ed Sheeran", duration: "3:53", emoji: "🎸" },
      { title: "Uptown Funk", artist: "Mark Ronson ft. Bruno Mars", duration: "4:30", emoji: "🔥" },
      { title: "Dynamite", artist: "BTS", duration: "3:19", emoji: "💣" },
      { title: "Anti-Hero", artist: "Taylor Swift", duration: "3:20", emoji: "🦹" },
      { title: "Unholy", artist: "Sam Smith ft. Kim Petras", duration: "2:36", emoji: "😈" },
    ],
  },
  {
    id: "trap",
    name: "Leonida Trap",
    emoji: "🎤",
    color: "#b820ff",
    desc: "Street heat & bass",
    songs: [
      { title: "HUMBLE.", artist: "Kendrick Lamar", duration: "2:57", emoji: "👑" },
      { title: "God's Plan", artist: "Drake", duration: "3:18", emoji: "🙏" },
      { title: "SICKO MODE", artist: "Travis Scott ft. Drake", duration: "5:12", emoji: "🌙" },
      { title: "Money in the Grave", artist: "Drake ft. Rick Ross", duration: "3:49", emoji: "💰" },
      { title: "Mo Bamba", artist: "Sheck Wes", duration: "3:06", emoji: "🏀" },
      { title: "Butterfly Effect", artist: "Travis Scott", duration: "3:59", emoji: "🦋" },
    ],
  },
  {
    id: "hiphop",
    name: "Vice City Radio",
    emoji: "📻",
    color: "#ff8c00",
    desc: "Classic bangers & heat",
    songs: [
      { title: "Lose Yourself", artist: "Eminem", duration: "5:26", emoji: "🎤" },
      { title: "In Da Club", artist: "50 Cent", duration: "3:50", emoji: "🥂" },
      { title: "Yeah!", artist: "Usher ft. Lil Jon", duration: "4:12", emoji: "🎵" },
      { title: "Gold Digger", artist: "Kanye West ft. Jamie Foxx", duration: "3:28", emoji: "💛" },
      { title: "Beautiful Girls", artist: "Sean Kingston", duration: "3:57", emoji: "🌟" },
      { title: "One Dance", artist: "Drake ft. WizKid", duration: "2:53", emoji: "💃" },
    ],
  },
];

type StationId = string | null;

const SONG_DURATION_S = 90;

function createAmbientSound(ctx: AudioContext, stationId: string): AudioNode[] {
  const nodes: AudioNode[] = [];

  const makeNoise = (type: "white" | "brown" = "white", gain = 0.08) => {
    const bufLen = ctx.sampleRate * 2;
    const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate);
    const data = buf.getChannelData(0);
    if (type === "white") {
      for (let i = 0; i < bufLen; i++) data[i] = Math.random() * 2 - 1;
    } else {
      let last = 0;
      for (let i = 0; i < bufLen; i++) {
        const w = Math.random() * 2 - 1;
        data[i] = (last + 0.02 * w) / 1.02;
        last = data[i];
        data[i] *= 3.5;
      }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(g);
    src.start();
    nodes.push(src, g);
    return { src, g };
  };

  const makeTone = (freq: number, type: OscillatorType = "sine", gain = 0.04) => {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    osc.start();
    nodes.push(osc, g);
    return { osc, g };
  };

  const makeLFO = (target: AudioParam, freq = 0.2, depth = 0.015) => {
    const lfo = ctx.createOscillator();
    lfo.frequency.value = freq;
    const lfoG = ctx.createGain();
    lfoG.gain.value = depth;
    lfo.connect(lfoG);
    lfoG.connect(target);
    lfo.start();
    nodes.push(lfo, lfoG);
  };

  const vol = Math.min(1, Math.max(0, Number(localStorage.getItem("phone_volume") ?? 70) / 100));
  const master = ctx.createGain();
  master.gain.value = 0.5 * vol;
  master.connect(ctx.destination);
  nodes.push(master);

  if (stationId === "beach") {
    const { g: noiseG } = makeNoise("brown", 0.35);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass"; lpf.frequency.value = 400; lpf.Q.value = 0.8;
    noiseG.connect(lpf); lpf.connect(master);
    makeLFO(lpf.frequency, 0.12, 80); nodes.push(lpf);
    const { osc: bird1, g: bg } = makeTone(2200, "sine", 0.015);
    bird1.frequency.setValueAtTime(2200, ctx.currentTime);
    bird1.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.3);
    bg.connect(master);
    const { osc: wave } = makeTone(55, "sine", 0.06);
    const waveLpf = ctx.createBiquadFilter();
    waveLpf.type = "lowpass"; waveLpf.frequency.value = 200;
    wave.connect(waveLpf); waveLpf.connect(master);
    makeLFO(wave.frequency, 0.08, 8); nodes.push(waveLpf);
  }

  if (stationId === "nights") {
    const chord = [130.8, 164.8, 196, 261.6];
    chord.forEach((freq, i) => {
      const { osc, g } = makeTone(freq, "sawtooth", 0.025);
      const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = 300;
      const env = ctx.createGain(); env.gain.value = 0.4;
      g.connect(hpf); hpf.connect(env); env.connect(master);
      makeLFO(env.gain, 0.25 + i * 0.05, 0.1); nodes.push(hpf, env);
    });
    const { g: bassG } = makeTone(65.4, "triangle", 0.08); bassG.connect(master);
    const { g: noiseG } = makeNoise("white", 0.015);
    const hpf2 = ctx.createBiquadFilter(); hpf2.type = "highpass"; hpf2.frequency.value = 8000;
    noiseG.connect(hpf2); hpf2.connect(master); nodes.push(hpf2);
  }

  if (stationId === "ocean") {
    const { g } = makeNoise("brown", 0.4);
    const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 300; lpf.Q.value = 1.2;
    g.connect(lpf); lpf.connect(master); nodes.push(lpf);
    const { osc: dep } = makeTone(40, "sine", 0.1); dep.connect(master);
    makeLFO(dep.frequency, 0.06, 5);
    const { osc: mid } = makeTone(110, "sine", 0.04); mid.connect(master);
    makeLFO(mid.frequency, 0.1, 10);
  }

  if (stationId === "highway" || stationId === "hiphop") {
    const { g: rumbleG } = makeTone(80, "sawtooth", 0.12);
    const lpf = ctx.createBiquadFilter(); lpf.type = "lowpass"; lpf.frequency.value = 200;
    rumbleG.connect(lpf); lpf.connect(master); nodes.push(lpf);
    const { g: midG } = makeTone(150, "triangle", 0.05); midG.connect(master);
    makeLFO(midG.gain, 4, 0.025);
    const { g } = makeNoise("white", 0.04);
    const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = 2000;
    g.connect(hpf); hpf.connect(master); nodes.push(hpf);
  }

  if (stationId === "trap") {
    const { g: bassG } = makeTone(55, "sawtooth", 0.18); bassG.connect(master);
    makeLFO(bassG.gain, 2, 0.08);
    const { g: sub } = makeTone(41, "sine", 0.12); sub.connect(master);
    const chord2 = [220, 277.2, 329.6];
    chord2.forEach((freq) => {
      const { g } = makeTone(freq, "sawtooth", 0.018);
      const hpf = ctx.createBiquadFilter(); hpf.type = "highpass"; hpf.frequency.value = 800;
      g.connect(hpf); hpf.connect(master); nodes.push(hpf);
    });
    const { g: hiG } = makeNoise("white", 0.025);
    const hpf3 = ctx.createBiquadFilter(); hpf3.type = "highpass"; hpf3.frequency.value = 10000;
    hiG.connect(hpf3); hpf3.connect(master); nodes.push(hpf3);
  }

  return nodes;
}

const EQ_BARS = 12;

export function GTA6Radio() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<StationId>(null);
  const [songIndex, setSongIndex] = useState(0);
  const [songProgress, setSongProgress] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const eqBarsRef = useRef<(HTMLDivElement | null)[]>([]);
  const eqFrameRef = useRef<number>(0);
  const songTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopAll = useCallback(() => {
    nodesRef.current.forEach(n => {
      try { (n as AudioBufferSourceNode).stop?.(); } catch {}
      try { (n as OscillatorNode).stop?.(); } catch {}
      n.disconnect();
    });
    nodesRef.current = [];
  }, []);

  const playStation = useCallback((id: StationId) => {
    stopAll();
    if (!id) { setActive(null); setSongIndex(0); setSongProgress(0); return; }
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    nodesRef.current = createAmbientSound(ctx, id);
    setActive(id);
    setSongIndex(0);
    setSongProgress(0);
  }, [stopAll]);

  // Song rotation timer
  useEffect(() => {
    if (songTimerRef.current) clearInterval(songTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (!active) { setSongProgress(0); return; }

    const station = STATIONS.find(s => s.id === active);
    if (!station) return;

    songTimerRef.current = setInterval(() => {
      setSongIndex(prev => (prev + 1) % station.songs.length);
      setSongProgress(0);
    }, SONG_DURATION_S * 1000);

    progressTimerRef.current = setInterval(() => {
      setSongProgress(prev => Math.min(100, prev + (100 / SONG_DURATION_S)));
    }, 1000);

    return () => {
      if (songTimerRef.current) clearInterval(songTimerRef.current);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    };
  }, [active]);

  // EQ animation — direct DOM manipulation, no setState
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
        const h = 15 + Math.abs(Math.sin(t * (1 + i * 0.1)) * Math.cos(t * 0.5)) * 75;
        el.style.height = `${h}%`;
        el.style.background = `linear-gradient(to top, ${color}, ${color}60)`;
      });
      eqFrameRef.current = requestAnimationFrame(tick);
    };
    eqFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(eqFrameRef.current);
  }, [active]);

  useEffect(() => () => {
    stopAll();
    cancelAnimationFrame(eqFrameRef.current);
    if (songTimerRef.current) clearInterval(songTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
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
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/40">Radio</span>
              {active && (
                <button
                  onClick={() => { stopAll(); setActive(null); setSongProgress(0); }}
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
                    <p className="text-[10px] font-black text-white leading-none truncate">{currentSong.title}</p>
                    <p className="text-[8px] text-white/40 mt-0.5 truncate">{currentSong.artist}</p>
                  </div>
                  <span className="text-[8px] text-white/30 shrink-0">{currentSong.duration}</span>
                </div>
                {/* Progress bar */}
                <div className="h-0.5 mx-2.5 mb-2 rounded-full bg-white/10 overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all duration-1000"
                    style={{ width: `${songProgress}%`, background: activeStation?.color }}
                  />
                </div>
              </div>
            )}

            {/* Stations */}
            <div className="flex flex-col gap-1.5">
              {STATIONS.map(s => {
                const isPlaying = active === s.id;
                const nextSong = isPlaying ? currentSong : s.songs[0];
                return (
                  <button
                    key={s.id}
                    onClick={() => isPlaying ? (stopAll(), setActive(null), setSongProgress(0)) : playStation(s.id)}
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
                      <p className="text-[8px] text-white/30 truncate">
                        {isPlaying ? `♪ ${nextSong?.title}` : nextSong?.title}
                      </p>
                    </div>
                    {isPlaying && (
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                    )}
                  </button>
                );
              })}
            </div>
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
          {active ? `${activeStation?.emoji} On Air` : "Radio"}
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
