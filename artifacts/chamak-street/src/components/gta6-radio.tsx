import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PINK = "#ff2d9c";
const CYAN = "#00d4ff";
const GOLD = "#ffd060";

interface Station {
  id: string;
  name: string;
  emoji: string;
  color: string;
  desc: string;
}

const STATIONS: Station[] = [
  { id: "beach",   name: "Beach FM",         emoji: "🌴", color: CYAN,    desc: "Waves & tropical breeze" },
  { id: "nights",  name: "Vice City Nights",  emoji: "🌆", color: PINK,    desc: "Neon synth & city pulse" },
  { id: "ocean",   name: "Ocean Breeze",      emoji: "🌊", color: "#40c0ff", desc: "Deep water & calm" },
  { id: "highway", name: "Highway Drive",     emoji: "🚗", color: GOLD,    desc: "Open road & speed" },
];

type StationId = "beach" | "nights" | "ocean" | "highway" | null;

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

  const master = ctx.createGain();
  master.gain.value = 0.5;
  master.connect(ctx.destination);
  nodes.push(master);

  if (stationId === "beach") {
    const { src: noiseS, g: noiseG } = makeNoise("brown", 0.35);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 400;
    lpf.Q.value = 0.8;
    noiseG.connect(lpf);
    lpf.connect(master);
    makeLFO(lpf.frequency, 0.12, 80);
    nodes.push(lpf);

    const { osc: bird1, g: bg } = makeTone(2200, "sine", 0.015);
    bird1.frequency.setValueAtTime(2200, ctx.currentTime);
    bird1.frequency.exponentialRampToValueAtTime(2600, ctx.currentTime + 0.3);
    bg.connect(master);

    const { osc: wave } = makeTone(55, "sine", 0.06);
    const waveLpf = ctx.createBiquadFilter();
    waveLpf.type = "lowpass";
    waveLpf.frequency.value = 200;
    wave.connect(waveLpf);
    waveLpf.connect(master);
    makeLFO(wave.frequency, 0.08, 8);
    nodes.push(waveLpf);
  }

  if (stationId === "nights") {
    const chord = [130.8, 164.8, 196, 261.6];
    chord.forEach((freq, i) => {
      const { osc, g } = makeTone(freq, "sawtooth", 0.025);
      const hpf = ctx.createBiquadFilter();
      hpf.type = "highpass";
      hpf.frequency.value = 300;
      const env = ctx.createGain();
      env.gain.value = 0.4;
      g.connect(hpf);
      hpf.connect(env);
      env.connect(master);
      makeLFO(env.gain, 0.25 + i * 0.05, 0.1);
      nodes.push(hpf, env);
    });
    const { g: bassG } = makeTone(65.4, "triangle", 0.08);
    bassG.connect(master);
    const { src: noiseS, g: noiseG } = makeNoise("white", 0.015);
    const hpf2 = ctx.createBiquadFilter();
    hpf2.type = "highpass";
    hpf2.frequency.value = 8000;
    noiseG.connect(hpf2);
    hpf2.connect(master);
    nodes.push(hpf2);
  }

  if (stationId === "ocean") {
    const { src, g } = makeNoise("brown", 0.4);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 300;
    lpf.Q.value = 1.2;
    g.connect(lpf);
    lpf.connect(master);
    nodes.push(lpf);
    const { osc: dep } = makeTone(40, "sine", 0.1);
    dep.connect(master);
    makeLFO(dep.frequency, 0.06, 5);
    const { osc: mid } = makeTone(110, "sine", 0.04);
    mid.connect(master);
    makeLFO(mid.frequency, 0.1, 10);
  }

  if (stationId === "highway") {
    const { g: rumbleG } = makeTone(80, "sawtooth", 0.12);
    const lpf = ctx.createBiquadFilter();
    lpf.type = "lowpass";
    lpf.frequency.value = 200;
    rumbleG.connect(lpf);
    lpf.connect(master);
    nodes.push(lpf);
    const { g: midG } = makeTone(150, "triangle", 0.05);
    midG.connect(master);
    makeLFO(midG.gain, 4, 0.025);
    const { src, g } = makeNoise("white", 0.04);
    const hpf = ctx.createBiquadFilter();
    hpf.type = "highpass";
    hpf.frequency.value = 2000;
    g.connect(hpf);
    hpf.connect(master);
    nodes.push(hpf);
  }

  return nodes;
}

const EQ_BARS = 12;

export function GTA6Radio() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState<StationId>(null);
  const [eqVals, setEqVals] = useState<number[]>(Array(EQ_BARS).fill(0.1));
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const eqFrameRef = useRef<number>(0);

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
    if (!id) { setActive(null); return; }
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === "suspended") ctx.resume();
    const nodes = createAmbientSound(ctx, id);
    nodesRef.current = nodes;
    setActive(id);
  }, [stopAll]);

  useEffect(() => {
    if (!active) {
      cancelAnimationFrame(eqFrameRef.current);
      setEqVals(Array(EQ_BARS).fill(0.08));
      return;
    }
    let frame = 0;
    const tick = () => {
      frame++;
      setEqVals(prev => prev.map((_, i) => {
        const t = frame * 0.05 + i * 0.7;
        return 0.15 + Math.abs(Math.sin(t * (1 + i * 0.1)) * Math.cos(t * 0.5)) * 0.75;
      }));
      eqFrameRef.current = requestAnimationFrame(tick);
    };
    eqFrameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(eqFrameRef.current);
  }, [active]);

  useEffect(() => () => { stopAll(); cancelAnimationFrame(eqFrameRef.current); }, [stopAll]);

  const activeStation = STATIONS.find(s => s.id === active);

  return (
    <div className="fixed bottom-8 left-6 z-[90] flex flex-col items-start gap-2" style={{ pointerEvents: "auto" }}>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.92 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="rounded-2xl p-4 w-60 mb-1"
            style={{
              background: "rgba(7,7,28,0.92)",
              backdropFilter: "blur(20px)",
              border: `1px solid ${active ? (activeStation?.color ?? PINK) : "rgba(255,255,255,0.12)"}40`,
              boxShadow: `0 20px 60px rgba(0,0,0,0.6), 0 0 30px ${active ? (activeStation?.color ?? PINK) : CYAN}18`,
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-black uppercase tracking-[0.35em] text-white/40">Radio</span>
              {active && (
                <button
                  onClick={() => { stopAll(); setActive(null); }}
                  className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full"
                  style={{ color: activeStation?.color, border: `1px solid ${activeStation?.color}40` }}
                >
                  Stop
                </button>
              )}
            </div>

            {/* Equalizer */}
            <div className="flex items-end gap-0.5 h-8 mb-3">
              {eqVals.map((v, i) => (
                <div
                  key={i}
                  className="flex-1 rounded-sm transition-all duration-75"
                  style={{
                    height: `${v * 100}%`,
                    background: active
                      ? `linear-gradient(to top, ${activeStation?.color ?? CYAN}, ${activeStation?.color ?? CYAN}60)`
                      : "rgba(255,255,255,0.08)",
                  }}
                />
              ))}
            </div>

            {/* Now playing */}
            {active && (
              <div className="mb-3 px-2 py-1.5 rounded-lg" style={{ background: `${activeStation?.color}12`, border: `1px solid ${activeStation?.color}25` }}>
                <div className="flex items-center gap-2">
                  <span className="text-base">{activeStation?.emoji}</span>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-white leading-none">{activeStation?.name}</p>
                    <p className="text-[8px] text-white/40 mt-0.5">{activeStation?.desc}</p>
                  </div>
                  <div className="ml-auto flex gap-0.5">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-0.5 rounded-full"
                        style={{
                          height: 12, background: activeStation?.color,
                          animation: `eqDot ${0.5 + i * 0.2}s ${i * 0.1}s ease-in-out infinite alternate`,
                        }} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Stations */}
            <div className="flex flex-col gap-1.5">
              {STATIONS.map(s => (
                <button
                  key={s.id}
                  onClick={() => active === s.id ? (stopAll(), setActive(null)) : playStation(s.id as StationId)}
                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all duration-200"
                  style={{
                    background: active === s.id ? `${s.color}18` : "rgba(255,255,255,0.04)",
                    border: `1px solid ${active === s.id ? s.color + "50" : "rgba(255,255,255,0.06)"}`,
                    transform: active === s.id ? "scale(1.01)" : "scale(1)",
                  }}
                >
                  <span className="text-sm">{s.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black uppercase tracking-wider truncate"
                      style={{ color: active === s.id ? s.color : "rgba(255,255,255,0.8)" }}>{s.name}</p>
                    <p className="text-[8px] text-white/30 truncate">{s.desc}</p>
                  </div>
                  {active === s.id && (
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: s.color, boxShadow: `0 0 6px ${s.color}` }} />
                  )}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Radio toggle button */}
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
          {active ? activeStation?.emoji + " On Air" : "Radio"}
        </span>
      </motion.button>

      <style>{`
        @keyframes eqDot { from { height: 4px; } to { height: 12px; } }
      `}</style>
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
