import { useMemo } from "react";

const PINK  = "#ff2d9c";
const CYAN  = "#00d4ff";
const GOLD  = "#ffd060";

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h >= 20 || h < 6)  return "night";
  if (h >= 17 && h < 20) return "dusk";
  if (h >= 6  && h < 10) return "dawn";
  return "day";
}

const SKY: Record<string, { top: string; mid: string; low: string; horizon: string }> = {
  night: { top: "#010612", mid: "#040d26", low: "#0a1a3a", horizon: "#0d2240" },
  dusk:  { top: "#0a0618", mid: "#2a0f3d", low: "#7a2555", horizon: "#e06030" },
  dawn:  { top: "#060e1e", mid: "#0e2040", low: "#264d7a", horizon: "#5090b0" },
  day:   { top: "#07071c", mid: "#0c1540", low: "#152260", horizon: "#1e3080" },
};

const STARS = [
  [124,48],[289,22],[412,68],[567,15],[712,42],[834,72],[956,28],[1088,58],
  [1221,35],[1345,65],[1410,18],[87,85],[340,95],[655,82],[890,45],[1130,90],
  [198,30],[470,75],[780,12],[1020,55],[1280,40],[60,60],[520,30],[1370,80],
  [760,92],[310,50],[940,20],[1180,70],[430,88],[830,38],[1050,62],[240,16],
  [680,78],[1300,25],[110,44],[595,55],[1140,84],[370,8],[870,67],[1240,46],
];

const CLOUDS = [
  { x: -200, y: 60,  w: 280, h: 80,  dur: 80,  delay: 0   },
  { x: 300,  y: 100, w: 220, h: 60,  dur: 110, delay: 20  },
  { x: 700,  y: 40,  w: 320, h: 90,  dur: 95,  delay: 45  },
  { x: 1100, y: 80,  w: 200, h: 70,  dur: 125, delay: 10  },
  { x: -400, y: 130, w: 260, h: 65,  dur: 100, delay: 60  },
  { x: 500,  y: 25,  w: 180, h: 55,  dur: 85,  delay: 35  },
  { x: 950,  y: 110, w: 240, h: 75,  dur: 115, delay: 70  },
];

const FAR_BLDGS: [number,number,number][] = [
  [0,32,68],[36,20,48],[60,38,92],[102,24,60],[130,45,82],[180,28,54],
  [212,48,104],[265,30,68],[299,22,44],[325,52,125],[382,36,78],[422,26,58],
  [452,42,98],[498,32,70],[534,24,48],[562,48,114],[615,30,72],[648,22,52],
  [674,40,92],[718,28,62],[750,52,132],[806,36,78],[845,22,48],[870,42,102],
  [916,30,68],[952,48,118],[1004,28,62],[1038,36,86],[1078,20,44],[1102,44,108],
  [1150,30,70],[1184,24,52],[1212,48,124],[1264,32,74],[1300,28,58],[1332,42,96],
  [1378,30,68],[1412,22,48],[1437,36,85],
];

const MID_BLDGS: [number,number,number][] = [
  [0,55,145],[60,38,102],[102,65,185],[172,42,122],[218,75,205],[298,48,155],
  [350,58,175],[412,42,132],[458,68,195],[530,52,162],[586,42,132],[632,80,215],
  [716,48,152],[768,58,178],[830,42,138],[876,62,195],[942,52,168],[998,44,148],
  [1046,68,205],[1118,50,162],[1172,58,182],[1234,44,142],[1282,72,210],[1358,52,168],
  [1414,42,132],
];

const NEAR_BLDGS: [number,number,number,number,number][] = [
  // [x, w, h, winCols, winRows]
  [0,   88, 285, 4, 10],
  [92,  105,355, 5, 12],
  [202, 72, 252, 3, 9],
  [278, 128,415, 6, 14],
  [410, 85, 305, 4, 11],
  [499, 95, 345, 4, 12],
  [598, 115,388, 5, 13],
  [718, 78, 272, 3, 10],
  [800, 135,428, 6, 15],
  [940, 88, 315, 4, 11],
  [1032,98, 365, 4, 13],
  [1134,115,408, 5, 14],
  [1254,82, 292, 4, 10],
  [1340,95, 338, 4, 12],
  [1439,62, 222, 3, 8],
];

const WIN_COLORS_NIGHT = ["#ffd580","#ffe4a0","#fff3c0","#aadcff","#ffa0d0"];
const WIN_COLORS_DAY   = ["#1a2040","#1e2850","#162035"];

export function GTA6WorldBackground({ cinematic = false }: { cinematic?: boolean }) {
  const tod = useMemo(() => getTimeOfDay(), []);
  const sky = SKY[tod];
  const isNight = tod === "night";
  const isDusk  = tod === "dusk";
  const showStars = isNight || isDusk;
  const litFrac = isNight ? 0.75 : isDusk ? 0.45 : tod === "dawn" ? 0.2 : 0.04;

  const winColors = isNight || isDusk ? WIN_COLORS_NIGHT : WIN_COLORS_DAY;

  const GROUND_Y = 620;

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      <svg
        viewBox="0 0 1440 800"
        preserveAspectRatio="xMidYMid slice"
        className="w-full h-full"
        style={{
          transition: cinematic ? "transform 8s ease-in-out" : "none",
          transform: cinematic ? "scale(1.035) translateY(-8px)" : "scale(1)",
        }}
      >
        <defs>
          <linearGradient id="wbg-sky" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={sky.top} />
            <stop offset="40%"  stopColor={sky.mid} />
            <stop offset="75%"  stopColor={sky.low} />
            <stop offset="100%" stopColor={sky.horizon} />
          </linearGradient>
          <linearGradient id="wbg-water" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="#0a1e3a" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#040d1c" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="wbg-haze" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor={sky.horizon} stopOpacity="0" />
            <stop offset="100%" stopColor={sky.horizon} stopOpacity="0.55" />
          </linearGradient>
          <filter id="wbg-blur-far" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>
          <filter id="wbg-blur-mid" x="-5%" y="-5%" width="110%" height="110%">
            <feGaussianBlur stdDeviation="0.6" />
          </filter>
          <filter id="wbg-glow-neon" x="-20%" y="-80%" width="140%" height="260%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <radialGradient id="wbg-moon" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#ffffee" />
            <stop offset="100%" stopColor="#dde8ff" />
          </radialGradient>
          <radialGradient id="wbg-sun" cx="50%" cy="50%" r="50%">
            <stop offset="0%"   stopColor="#fffbd0" />
            <stop offset="60%"  stopColor="#ffd060" />
            <stop offset="100%" stopColor="#ff8030" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="wbg-water-shine" cx="50%" cy="0%" r="60%">
            <stop offset="0%"  stopColor={CYAN} stopOpacity="0.08" />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
          <clipPath id="wbg-sky-clip">
            <rect x="0" y="0" width="1440" height={GROUND_Y} />
          </clipPath>
        </defs>

        {/* ── SKY ── */}
        <rect x="0" y="0" width="1440" height="800" fill="url(#wbg-sky)" />

        {/* ── STARS ── */}
        {showStars && STARS.map(([sx, sy], i) => (
          <circle
            key={`s${i}`}
            cx={sx} cy={sy} r={i % 3 === 0 ? 1.4 : 0.8}
            fill="white"
            opacity={0.3 + (i % 5) * 0.12}
            style={{
              animation: `wbgStar ${2 + (i % 4)}s ${(i * 0.3) % 3}s ease-in-out infinite alternate`,
            }}
          />
        ))}

        {/* ── MOON / SUN ── */}
        {isNight && (
          <circle cx="1260" cy="90" r="32" fill="url(#wbg-moon)" opacity="0.92" />
        )}
        {(tod === "dawn" || tod === "dusk") && (
          <ellipse cx="200" cy="490" rx="80" ry="50" fill="url(#wbg-sun)" opacity="0.7" />
        )}

        {/* ── CLOUDS ── */}
        {CLOUDS.map((c, i) => (
          <g
            key={`c${i}`}
            style={{
              animation: `wbgCloud ${c.dur}s ${c.delay}s linear infinite`,
              willChange: "transform",
            }}
          >
            <ellipse cx={c.x + c.w * 0.5} cy={c.y} rx={c.w * 0.5} ry={c.h * 0.38}
              fill="white" opacity={isNight ? 0.04 : 0.06} />
            <ellipse cx={c.x + c.w * 0.3} cy={c.y + 10} rx={c.w * 0.38} ry={c.h * 0.3}
              fill="white" opacity={isNight ? 0.03 : 0.05} />
            <ellipse cx={c.x + c.w * 0.7} cy={c.y + 8} rx={c.w * 0.32} ry={c.h * 0.28}
              fill="white" opacity={isNight ? 0.03 : 0.05} />
          </g>
        ))}

        {/* ── NEON CITY GLOW (night/dusk) ── */}
        {(isNight || isDusk) && (
          <>
            <ellipse cx="500" cy={GROUND_Y - 10} rx="250" ry="60"
              fill={PINK} opacity="0.05" filter="url(#wbg-blur-far)" />
            <ellipse cx="950" cy={GROUND_Y - 10} rx="200" ry="50"
              fill={CYAN} opacity="0.06" filter="url(#wbg-blur-far)" />
            <ellipse cx="1200" cy={GROUND_Y - 5} rx="180" ry="45"
              fill="#9b30ff" opacity="0.05" filter="url(#wbg-blur-far)" />
          </>
        )}

        {/* ── FAR BUILDINGS ── */}
        <g opacity="0.22" filter="url(#wbg-blur-far)">
          {FAR_BLDGS.map(([x, w, h], i) => (
            <rect key={`fb${i}`} x={x} y={GROUND_Y - h} width={w} height={h}
              fill="#1a2550" />
          ))}
        </g>

        {/* ── MID BUILDINGS ── */}
        <g opacity="0.42" filter="url(#wbg-blur-mid)">
          {MID_BLDGS.map(([x, w, h], i) => (
            <rect key={`mb${i}`} x={x} y={GROUND_Y - h} width={w} height={h}
              fill="#10183a" />
          ))}
          {/* Some antenna / spire tops */}
          {MID_BLDGS.filter((_, i) => i % 4 === 0).map(([x, w, h], i) => (
            <rect key={`ma${i}`} x={x + w / 2 - 1} y={GROUND_Y - h - 20} width={2} height={20}
              fill="#1a2550" />
          ))}
        </g>

        {/* ── NEAR BUILDINGS (with windows) ── */}
        {NEAR_BLDGS.map(([x, w, h, wCols, wRows], bi) => {
          const baseY = GROUND_Y - h;
          const padX = 6, padY = 8;
          const winW = (w - padX * 2 - (wCols - 1) * 3) / wCols;
          const winH = (h - padY * 2 - (wRows - 1) * 4) / wRows;
          return (
            <g key={`nb${bi}`}>
              <rect x={x} y={baseY} width={w} height={h} fill="#0a1028" />
              {/* windows */}
              {Array.from({ length: wRows }, (_, row) =>
                Array.from({ length: wCols }, (_, col) => {
                  const seed = (bi * 17 + row * 7 + col * 3) % 100;
                  const lit  = seed < litFrac * 100;
                  if (!lit) return null;
                  const wx = x + padX + col * (winW + 3);
                  const wy = baseY + padY + row * (winH + 4);
                  const color = winColors[seed % winColors.length];
                  return (
                    <rect key={`w${bi}-${row}-${col}`}
                      x={wx} y={wy} width={Math.max(winW, 3)} height={Math.max(winH, 3)}
                      fill={color} opacity={0.7 + (seed % 3) * 0.1}
                      style={isNight ? {
                        animation: `wbgWin ${3 + (seed % 4)}s ${seed * 0.4}s ease-in-out infinite alternate`,
                      } : undefined}
                    />
                  );
                })
              )}
              {/* Art Deco top ornament for tall buildings */}
              {h > 300 && (
                <>
                  <rect x={x + w * 0.3} y={baseY - 25} width={w * 0.4} height={25}
                    fill="#0e1535" />
                  <rect x={x + w * 0.42} y={baseY - 45} width={w * 0.16} height={22}
                    fill="#0e1535" />
                  {(isNight || isDusk) && (
                    <rect x={x + w * 0.48} y={baseY - 48} width={4} height={4}
                      fill={bi % 2 === 0 ? PINK : CYAN} opacity="0.9"
                      filter="url(#wbg-glow-neon)"
                      style={{ animation: "wbgNeon 3s ease-in-out infinite alternate" }}
                    />
                  )}
                </>
              )}
            </g>
          );
        })}

        {/* ── NEON SIGNS on buildings (night) ── */}
        {isNight && (
          <g filter="url(#wbg-glow-neon)">
            <text x="835" y={GROUND_Y - 340} fontSize="10" fill={PINK} fontWeight="900"
              letterSpacing="3" opacity="0.7"
              style={{ animation: "wbgNeon 5s 0s ease-in-out infinite alternate" }}>
              VICE CITY
            </text>
            <text x="510" y={GROUND_Y - 270} fontSize="8" fill={CYAN} fontWeight="900"
              letterSpacing="2" opacity="0.6"
              style={{ animation: "wbgNeon 7s 2s ease-in-out infinite alternate" }}>
              LEONIDA
            </text>
            <text x="292" y={GROUND_Y - 225} fontSize="9" fill={GOLD} fontWeight="900"
              letterSpacing="2" opacity="0.55"
              style={{ animation: "wbgNeon 4s 1s ease-in-out infinite alternate" }}>
              HOTEL
            </text>
          </g>
        )}

        {/* ── GROUND / ROAD ── */}
        <rect x="0" y={GROUND_Y} width="1440" height="18" fill="#0c1530" />
        <rect x="0" y={GROUND_Y + 5} width="1440" height="2" fill="#1a2550" opacity="0.5" />
        {/* Road markings */}
        {[60,180,300,420,540,660,780,900,1020,1140,1260,1380].map((lx, i) => (
          <rect key={`road${i}`} x={lx} y={GROUND_Y + 8} width={60} height={2}
            fill="#ffd060" opacity="0.15" />
        ))}

        {/* ── WATER / OCEAN ── */}
        <rect x="0" y={GROUND_Y + 18} width="1440" height={800 - GROUND_Y - 18}
          fill="url(#wbg-water)" />
        <rect x="0" y={GROUND_Y + 18} width="1440" height={80}
          fill="url(#wbg-water-shine)" />

        {/* ── ATMOSPHERIC HAZE ── */}
        <rect x="0" y={GROUND_Y - 120} width="1440" height="140"
          fill="url(#wbg-haze)" />

        {/* ── WATER REFLECTIONS ── */}
        {(isNight || isDusk) && NEAR_BLDGS.filter((_, i) => i % 3 === 0).map(([x, w], i) => (
          <rect key={`ref${i}`} x={x + w * 0.1} y={GROUND_Y + 22 + i * 4}
            width={w * 0.8} height={2 + i % 3}
            fill={i % 2 === 0 ? CYAN : PINK}
            opacity={0.04 + i * 0.005}
            style={{ animation: `wbgRef ${3 + i}s ${i * 0.5}s ease-in-out infinite alternate` }}
          />
        ))}
      </svg>

      {/* ── ANIMATED VEHICLES (HTML layer for performance) ── */}
      <WorldVehicles tod={tod} />

      {/* ── STREET LIGHTS (night) ── */}
      {(isNight || isDusk) && <StreetLights />}

      {/* ── WAVE BARS ── */}
      <WaveBars />

      <style>{WORLD_BG_CSS}</style>
    </div>
  );
}

function WorldVehicles({ tod }: { tod: string }) {
  const isNight = tod === "night" || tod === "dusk";

  const CARS = [
    { top: "77.5%", delay: 0,  dur: 28, dir: -1, size: 0.6 },
    { top: "77%",   delay: 14, dur: 38, dir: 1,  size: 0.5 },
    { top: "78%",   delay: 6,  dur: 22, dir: -1, size: 0.55 },
    { top: "76.5%", delay: 22, dur: 44, dir: 1,  size: 0.45 },
    { top: "77.8%", delay: 9,  dur: 32, dir: -1, size: 0.5 },
  ];
  const BOATS = [
    { top: "84%", delay: 0,  dur: 55, dir: 1  },
    { top: "86%", delay: 22, dur: 70, dir: -1 },
    { top: "83%", delay: 40, dur: 62, dir: 1  },
  ];
  const HELI = [
    { top: "22%", delay: 15, dur: 35, dir: 1  },
    { top: "18%", delay: 50, dur: 48, dir: -1 },
  ];
  const PLANE = [
    { top: "10%", delay: 30, dur: 90, dir: 1  },
    { top: "6%",  delay: 80, dur: 120,dir: -1 },
  ];

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {/* CARS */}
      {CARS.map((c, i) => (
        <div key={`car${i}`} className="absolute" style={{
          top: c.top, left: c.dir === 1 ? "-100px" : "calc(100% + 100px)",
          animation: `${c.dir === 1 ? "wbgCarR" : "wbgCarL"} ${c.dur}s ${c.delay}s linear infinite`,
          willChange: "transform", opacity: 0.35,
        }}>
          <svg width={52 * c.size} height={18 * c.size} viewBox="0 0 52 18">
            <rect x="4" y="9"  width="44" height="9"  rx="2" fill="#c0c8d0" />
            <rect x="10" y="3" width="26" height="7"  rx="3" fill="#a0acb8" />
            {isNight && <>
              <rect x="0"  y="11" width="6" height="4" rx="1" fill="#fffbe0" opacity="0.95" />
              <rect x="46" y="11" width="6" height="4" rx="1" fill="#ff4020" opacity="0.9" />
            </>}
          </svg>
        </div>
      ))}
      {/* BOATS */}
      {BOATS.map((b, i) => (
        <div key={`boat${i}`} className="absolute" style={{
          top: b.top, left: b.dir === 1 ? "-120px" : "calc(100% + 120px)",
          animation: `${b.dir === 1 ? "wbgCarR" : "wbgCarL"} ${b.dur}s ${b.delay}s linear infinite`,
          willChange: "transform", opacity: 0.25,
        }}>
          <svg width="64" height="24" viewBox="0 0 64 24">
            <path d="M4,16 Q32,6 60,16 L56,22 L8,22 Z" fill="#607080" />
            <rect x="22" y="6" width="20" height="10" rx="2" fill="#708090" />
            <rect x="30" y="0" width="3"  height="8"  fill="#506070" />
          </svg>
        </div>
      ))}
      {/* HELICOPTERS */}
      {HELI.map((h, i) => (
        <div key={`heli${i}`} className="absolute" style={{
          top: h.top, left: h.dir === 1 ? "-100px" : "calc(100% + 100px)",
          animation: `${h.dir === 1 ? "wbgCarR" : "wbgCarL"} ${h.dur}s ${h.delay}s linear infinite`,
          willChange: "transform", opacity: 0.4,
        }}>
          <svg width="52" height="24" viewBox="0 0 52 24">
            <ellipse cx="26" cy="16" rx="18" ry="6" fill="#304050" />
            <rect x="10" y="10" width="32" height="8" rx="4" fill="#405060" />
            <rect x="38" y="13" width="12" height="3" rx="1" fill="#304050" />
            <ellipse cx="26" cy="10" rx="22" ry="3" fill="none" stroke="#506070" strokeWidth="1.5"
              style={{ animation: "wbgRotor 0.08s linear infinite", transformOrigin: "26px 10px" }} />
            {isNight && <circle cx="8" cy="14" r="2" fill="#ff2020" opacity="0.9" style={{ animation: "wbgBlink 1s ease-in-out infinite" }} />}
          </svg>
        </div>
      ))}
      {/* AIRPLANES */}
      {PLANE.map((p, i) => (
        <div key={`plane${i}`} className="absolute" style={{
          top: p.top, left: p.dir === 1 ? "-150px" : "calc(100% + 150px)",
          animation: `${p.dir === 1 ? "wbgCarR" : "wbgCarL"} ${p.dur}s ${p.delay}s linear infinite`,
          willChange: "transform", opacity: 0.25,
        }}>
          <svg width="70" height="30" viewBox="0 0 70 30" style={{ transform: p.dir === -1 ? "scaleX(-1)" : "none" }}>
            <path d="M60,15 L5,18 L5,12 Z" fill="#c0c8d8" />
            <path d="M20,12 L40,4 L45,12 Z"  fill="#b0b8c8" />
            <path d="M20,18 L40,26 L45,18 Z" fill="#b0b8c8" />
            <path d="M5,13 L10,10 L12,15 L10,20 L5,17 Z" fill="#a0a8b8" />
            {isNight && <circle cx="62" cy="15" r="2" fill="#ffffff" opacity="0.8" style={{ animation: "wbgBlink 0.8s ease-in-out infinite" }} />}
          </svg>
        </div>
      ))}
    </div>
  );
}

function StreetLights() {
  const positions = [80, 200, 320, 440, 560, 680, 800, 920, 1040, 1160, 1280, 1400];
  return (
    <div className="absolute inset-0 pointer-events-none">
      {positions.map((pct, i) => (
        <div key={i} className="absolute" style={{
          left: `${(pct / 1440) * 100}%`,
          top: "74%",
        }}>
          <div style={{ width: 2, height: 28, background: "#304560", marginLeft: 5 }} />
          <div style={{
            width: 12, height: 4, borderRadius: 4, marginTop: -2,
            background: "#fffbe0",
            boxShadow: "0 0 8px 3px rgba(255,251,180,0.5)",
            animation: `wbgLight ${2 + i * 0.3}s ${i * 0.15}s ease-in-out infinite alternate`,
          }} />
        </div>
      ))}
    </div>
  );
}

function WaveBars() {
  return (
    <div className="absolute bottom-0 left-0 right-0 pointer-events-none overflow-hidden" style={{ height: 100 }}>
      <div style={{ animation: "wbgWave1 10s linear infinite", display: "flex", width: "200%", position: "absolute", bottom: 0 }}>
        {[0, 1].map(k => (
          <svg key={k} viewBox="0 0 1440 100" preserveAspectRatio="none"
            style={{ width: "50%", height: 100, flexShrink: 0 }}>
            <path d="M0,50 Q240,10 480,50 Q720,90 960,50 Q1200,10 1440,50 L1440,100 L0,100 Z"
              fill={CYAN} fillOpacity="0.06" />
          </svg>
        ))}
      </div>
      <div style={{ animation: "wbgWave2 16s linear infinite reverse", display: "flex", width: "200%", position: "absolute", bottom: 0 }}>
        {[0, 1].map(k => (
          <svg key={k} viewBox="0 0 1440 70" preserveAspectRatio="none"
            style={{ width: "50%", height: 70, flexShrink: 0 }}>
            <path d="M0,35 Q240,65 480,35 Q720,5 960,35 Q1200,65 1440,35 L1440,70 L0,70 Z"
              fill={CYAN} fillOpacity="0.04" />
          </svg>
        ))}
      </div>
    </div>
  );
}

const WORLD_BG_CSS = `
@keyframes wbgStar  { from { opacity: 0.2; } to { opacity: 0.9; } }
@keyframes wbgCloud { from { transform: translateX(-500px); } to { transform: translateX(calc(100vw + 500px)); } }
@keyframes wbgWin   { from { opacity: 0.4; } to { opacity: 0.95; } }
@keyframes wbgNeon  { from { opacity: 0.4; } to { opacity: 0.9;  } }
@keyframes wbgRef   { from { opacity: 0.03; scaleX: 0.9; } to { opacity: 0.09; scaleX: 1.05; } }
@keyframes wbgCarR  { from { transform: translateX(-160px); } to { transform: translateX(calc(100vw + 200px)); } }
@keyframes wbgCarL  { from { transform: translateX(calc(100vw + 200px)) scaleX(-1); } to { transform: translateX(-200px) scaleX(-1); } }
@keyframes wbgLight { from { opacity: 0.7; } to { opacity: 1; } }
@keyframes wbgBlink { 0%,100% { opacity: 1; } 50% { opacity: 0.1; } }
@keyframes wbgRotor { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
@keyframes wbgWave1 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@keyframes wbgWave2 { from { transform: translateX(0); } to { transform: translateX(-50%); } }
`;
