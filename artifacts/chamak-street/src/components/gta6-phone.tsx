import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const PINK = "#ff2d9c";
const CYAN = "#00d4ff";
const GOLD = "#ffd060";

type PhoneScreen =
  | "locked" | "home"
  | "contacts" | "maps" | "messages" | "music"
  | "camera" | "camera-review" | "gallery"
  | "settings" | "wanted"
  | "call-incoming" | "call-active" | "call-ended";

interface PhoneSettings {
  volume: number;
  soundEffects: boolean;
  haptic: boolean;
  wallpaper: "dark" | "sunset" | "ocean" | "neon" | "classic";
  language: "en" | "ar";
}

const DEFAULT_SETTINGS: PhoneSettings = {
  volume: 70,
  soundEffects: true,
  haptic: true,
  wallpaper: "dark",
  language: "en",
};

const WALLPAPERS: Record<PhoneSettings["wallpaper"], string> = {
  dark:    "linear-gradient(160deg, #0a1020 0%, #0d1835 50%, #080c20 100%)",
  sunset:  "linear-gradient(160deg, #1a0a05 0%, #2d1010 50%, #1a0510 100%)",
  ocean:   "linear-gradient(160deg, #051a2d 0%, #0a2040 50%, #051525 100%)",
  neon:    "linear-gradient(160deg, #0d0520 0%, #150d30 50%, #080520 100%)",
  classic: "linear-gradient(160deg, #101010 0%, #1a1a1a 50%, #0a0a0a 100%)",
};

const WALLPAPER_NAMES: Record<PhoneSettings["wallpaper"], string> = {
  dark:    "Vice City Dark",
  sunset:  "Leonida Sunset",
  ocean:   "Ocean Drive",
  neon:    "Neon Nights",
  classic: "Classic Black",
};

const WALLPAPER_ACCENTS: Record<PhoneSettings["wallpaper"], string> = {
  dark:    PINK,
  sunset:  "#ff6b3d",
  ocean:   CYAN,
  neon:    "#b820ff",
  classic: "#888",
};

const APPS = [
  { id: "contacts", icon: "👤", label: "Contacts", color: "#2ecc71" },
  { id: "maps",     icon: "🗺️",  label: "Maps",     color: CYAN },
  { id: "messages", icon: "💬",  label: "Messages", color: PINK },
  { id: "music",    icon: "🎵",  label: "Music",    color: GOLD },
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

function usePhoneSettings() {
  const [settings, setSettings] = useState<PhoneSettings>(() => {
    try {
      const stored = localStorage.getItem("phone_settings");
      return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch { return DEFAULT_SETTINGS; }
  });

  const update = useCallback((patch: Partial<PhoneSettings>) => {
    setSettings(prev => {
      const next = { ...prev, ...patch };
      localStorage.setItem("phone_settings", JSON.stringify(next));
      if (patch.volume !== undefined) localStorage.setItem("phone_volume", String(patch.volume));
      return next;
    });
  }, []);

  return { settings, update };
}

/* ── Camera Screen ── */
function CameraScreen({ onCapture, onBack }: { onCapture: (dataUrl: string) => void; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } } })
      .then(stream => {
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
          setStreaming(true);
        }
      })
      .catch(() => {
        // Try without environment constraint (laptop cameras)
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            streamRef.current = stream;
            if (videoRef.current) {
              videoRef.current.srcObject = stream;
              videoRef.current.play().catch(() => {});
              setStreaming(true);
            }
          })
          .catch(() => setError("Camera access denied. Allow camera in browser settings."));
      });

    return () => { streamRef.current?.getTracks().forEach(t => t.stop()); };
  }, []);

  const capture = () => {
    if (!videoRef.current || !canvasRef.current || !streaming) return;
    setFlash(true);
    setTimeout(() => setFlash(false), 200);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    streamRef.current?.getTracks().forEach(t => t.stop());
    onCapture(dataUrl);
  };

  return (
    <div className="flex-1 flex flex-col relative overflow-hidden bg-black">
      {flash && <div className="absolute inset-0 bg-white z-50 pointer-events-none" style={{ opacity: 0.7 }} />}
      {error ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
          <span className="text-4xl">📷</span>
          <p className="text-white/60 text-[10px] leading-relaxed">{error}</p>
          <button
            onClick={onBack}
            className="text-[9px] text-white/60 uppercase tracking-widest border border-white/20 px-4 py-1.5 rounded-full"
          >← Back</button>
        </div>
      ) : (
        <>
          <video
            ref={videoRef}
            className="absolute inset-0 w-full h-full object-cover"
            playsInline muted autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Overlay UI */}
          <div className="absolute inset-0 flex flex-col pointer-events-none">
            {/* Top bar */}
            <div className="flex justify-between items-center px-4 py-2 pointer-events-auto"
              style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0.5), transparent)" }}>
              <button onClick={onBack} className="text-white/80 text-sm leading-none">✕</button>
              <span className="text-[9px] font-black uppercase tracking-widest text-white/60">📸 Snap & Review</span>
              <div className="w-4" />
            </div>

            {/* Grid */}
            <div className="flex-1 grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} style={{ border: "0.5px solid rgba(255,255,255,0.12)" }} />
              ))}
            </div>

            {/* Bottom bar */}
            <div className="flex items-center justify-center gap-8 py-5 pointer-events-auto"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)" }}>
              <div className="w-10 h-10 rounded-xl overflow-hidden border border-white/20 bg-black/40 flex items-center justify-center text-xs text-white/40">
                🖼️
              </div>
              <button
                onClick={capture}
                disabled={!streaming}
                className="w-16 h-16 rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40"
                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
              >
                <div className="w-10 h-10 rounded-full bg-white" />
              </button>
              <div className="w-10 h-10 rounded-xl border border-white/20 flex items-center justify-center text-xs text-white/50">
                🔄
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/* ── Camera Review Screen ── */
function CameraReviewScreen({
  photo, onBack, onSubmit,
}: { photo: string; onBack: () => void; onSubmit: () => void }) {
  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [text, setText] = useState("");
  const [product, setProduct] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [err, setErr] = useState("");

  const submit = async () => {
    if (!name.trim() || !text.trim()) { setErr("Name & review required"); return; }
    setSubmitting(true); setErr("");
    try {
      const res = await fetch("/api/reviews/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: name.trim(),
          rating,
          body: text.trim(),
          productName: product.trim() || undefined,
          imageUrls: JSON.stringify([photo]),
        }),
      });
      if (!res.ok) throw new Error("Failed");
      setDone(true);
      setTimeout(onSubmit, 2500);
    } catch {
      setErr("Submit failed. Try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6">
        <span className="text-5xl">🎉</span>
        <p className="text-white font-black text-sm">Review Submitted!</p>
        <p className="text-white/40 text-[9px] text-center">Pending approval — thanks for your feedback!</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase tracking-widest">← Back</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">Write a Review</span>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col gap-3">
        {/* Photo preview */}
        <div className="relative rounded-xl overflow-hidden" style={{ height: 100 }}>
          <img src={photo} alt="Your photo" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
          <span className="absolute bottom-2 right-2 text-[8px] text-white/60 font-black uppercase tracking-widest">Your Photo</span>
        </div>

        {/* Star rating */}
        <div>
          <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1.5">Rating</p>
          <div className="flex gap-1.5">
            {[1,2,3,4,5].map(s => (
              <button key={s} onClick={() => setRating(s)} className="text-xl leading-none">
                {s <= rating ? "⭐" : "☆"}
              </button>
            ))}
          </div>
        </div>

        {/* Name */}
        <div>
          <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Your Name</p>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Ahmed K."
            className="w-full rounded-lg px-3 py-2 text-[10px] text-white placeholder-white/20 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
        </div>

        {/* Product */}
        <div>
          <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Product (optional)</p>
          <input
            value={product}
            onChange={e => setProduct(e.target.value)}
            placeholder="e.g. Street Hoodie"
            className="w-full rounded-lg px-3 py-2 text-[10px] text-white placeholder-white/20 outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
        </div>

        {/* Review text */}
        <div>
          <p className="text-[8px] text-white/40 uppercase tracking-widest mb-1">Your Review</p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="What did you think?"
            rows={3}
            className="w-full rounded-lg px-3 py-2 text-[10px] text-white placeholder-white/20 outline-none resize-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)" }}
          />
        </div>

        {err && <p className="text-[9px] text-red-400">{err}</p>}

        <button
          onClick={submit}
          disabled={submitting}
          className="w-full py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest text-white disabled:opacity-50"
          style={{ background: `linear-gradient(135deg, ${PINK}, #b820ff)` }}
        >
          {submitting ? "Submitting…" : "Submit Review"}
        </button>
      </div>
    </div>
  );
}

/* ── Gallery Screen ── */
function GalleryScreen({ onBack }: { onBack: () => void }) {
  const [photos] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem("phone_gallery") ?? "[]"); } catch { return []; }
  });

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase tracking-widest">← Back</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">Gallery</span>
      </div>
      {photos.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-3">
          <span className="text-4xl opacity-40">🖼️</span>
          <p className="text-[9px] text-white/30 uppercase tracking-widest">No photos yet</p>
          <p className="text-[8px] text-white/20">Take a photo with Camera</p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-3 py-2">
          <div className="grid grid-cols-3 gap-1.5">
            {photos.map((p, i) => (
              <div key={i} className="aspect-square rounded-lg overflow-hidden">
                <img src={p} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ── Settings Screen ── */
function SettingsScreen({
  settings, update, onBack,
}: { settings: PhoneSettings; update: (p: Partial<PhoneSettings>) => void; onBack: () => void }) {
  const accent = WALLPAPER_ACCENTS[settings.wallpaper];

  const Toggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      onClick={() => onChange(!value)}
      className="relative w-8 h-4 rounded-full transition-colors duration-200 shrink-0"
      style={{ background: value ? accent : "rgba(255,255,255,0.15)" }}
    >
      <div
        className="absolute top-0.5 w-3 h-3 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: value ? "translateX(17px)" : "translateX(2px)" }}
      />
    </button>
  );

  const Row = ({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) => (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-white/[0.06]">
      <div>
        <p className="text-[10px] font-bold text-white">{label}</p>
        {sub && <p className="text-[8px] text-white/30 mt-0.5">{sub}</p>}
      </div>
      {children}
    </div>
  );

  return (
    <div className="flex-1 flex flex-col overflow-y-auto">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase tracking-widest">← Back</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">Settings</span>
      </div>

      <div className="flex-1 px-4 py-3 flex flex-col gap-0">

        {/* Sound */}
        <p className="text-[8px] font-black uppercase tracking-widest mb-2 mt-1" style={{ color: accent }}>Sound</p>

        <Row label="Volume" sub={`${settings.volume}%`}>
          <input
            type="range" min="0" max="100" value={settings.volume}
            onChange={e => update({ volume: Number(e.target.value) })}
            className="w-20 accent-pink-500"
            style={{ accentColor: accent }}
          />
        </Row>

        <Row label="Sound Effects">
          <Toggle value={settings.soundEffects} onChange={v => update({ soundEffects: v })} />
        </Row>

        <Row label="Haptic Feedback">
          <Toggle value={settings.haptic} onChange={v => update({ haptic: v })} />
        </Row>

        {/* Wallpaper */}
        <p className="text-[8px] font-black uppercase tracking-widest mb-2 mt-4" style={{ color: accent }}>Wallpaper</p>

        <div className="grid grid-cols-5 gap-1.5 mb-3">
          {(Object.keys(WALLPAPERS) as PhoneSettings["wallpaper"][]).map(w => (
            <button
              key={w}
              onClick={() => update({ wallpaper: w })}
              className="flex flex-col items-center gap-1"
            >
              <div
                className="w-9 h-12 rounded-lg border-2 transition-all"
                style={{
                  background: WALLPAPERS[w],
                  borderColor: settings.wallpaper === w ? WALLPAPER_ACCENTS[w] : "transparent",
                  boxShadow: settings.wallpaper === w ? `0 0 8px ${WALLPAPER_ACCENTS[w]}60` : "none",
                }}
              />
              <span className="text-[6px] text-white/40 text-center leading-tight">{WALLPAPER_NAMES[w].split(" ")[0]}</span>
            </button>
          ))}
        </div>

        {/* Language */}
        <p className="text-[8px] font-black uppercase tracking-widest mb-2 mt-1" style={{ color: accent }}>Language</p>

        <Row label="Language">
          <div className="flex gap-1">
            {(["en", "ar"] as const).map(lang => (
              <button
                key={lang}
                onClick={() => update({ language: lang })}
                className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase transition-all"
                style={{
                  background: settings.language === lang ? accent : "rgba(255,255,255,0.08)",
                  color: settings.language === lang ? "#fff" : "rgba(255,255,255,0.4)",
                }}
              >
                {lang === "en" ? "EN" : "عربي"}
              </button>
            ))}
          </div>
        </Row>

        {/* About */}
        <p className="text-[8px] font-black uppercase tracking-widest mb-2 mt-4" style={{ color: accent }}>About</p>
        <div className="rounded-xl p-3 flex flex-col gap-1.5" style={{ background: "rgba(255,255,255,0.05)" }}>
          <div className="flex justify-between">
            <span className="text-[8px] text-white/40">Model</span>
            <span className="text-[8px] text-white/70 font-bold">Vice City 9 Pro</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[8px] text-white/40">OS</span>
            <span className="text-[8px] text-white/70 font-bold">Leonida OS v2.0</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[8px] text-white/40">Network</span>
            <span className="text-[8px] text-white/70 font-bold">Vice City 6G</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[8px] text-white/40">Storage</span>
            <span className="text-[8px] text-white/70 font-bold">512 GB</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Contacts Screen ── */
function ContactsScreen({ onBack }: { onBack: () => void }) {
  const contacts = [
    { name: "Jason Duval", role: "Partner", emoji: "🤠", color: CYAN },
    { name: "Lucia Caminos", role: "Partner", emoji: "💋", color: PINK },
    { name: "Chamak Street", role: "Business", emoji: "🛍️", color: GOLD },
    { name: "Trevor P.", role: "Old Friend", emoji: "😤", color: "#e74c3c" },
    { name: "Michael D.", role: "Contact", emoji: "🎩", color: "#2ecc71" },
    { name: "Lester C.", role: "Specialist", emoji: "🧠", color: "#9b59b6" },
  ];
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase">← Back</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">Contacts</span>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-1 flex flex-col gap-1.5">
        {contacts.map((c, i) => (
          <div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm shrink-0"
              style={{ background: `${c.color}30`, border: `1px solid ${c.color}40` }}>
              {c.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-white truncate">{c.name}</p>
              <p className="text-[8px] text-white/30">{c.role}</p>
            </div>
            <div className="flex gap-1.5">
              <button className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: "#2ecc7130" }}>📞</button>
              <button className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                style={{ background: `${PINK}30` }}>💬</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Messages Screen ── */
function MessagesScreen({ onBack }: { onBack: () => void }) {
  const [thread, setThread] = useState([
    { from: "Lucia", text: "We still on for tonight?", time: "22:14", mine: false },
    { from: "Me", text: "Yeah. Meet at the usual spot.", time: "22:15", mine: true },
    { from: "Lucia", text: "Got the goods. Don't be late 🔥", time: "22:17", mine: false },
    { from: "Jason", text: "Chamak drop coming tonight. Stay lowkey.", time: "22:45", mine: false },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const send = () => {
    if (!input.trim()) return;
    const responses = [
      "Say less 🤙", "On it.", "🔥", "No cap.", "Facts bro.", "Bet.", "Real talk.", "💯"
    ];
    const msg = { from: "Me", text: input.trim(), time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), mine: true };
    setThread(t => [...t, msg]);
    setInput("");
    setTimeout(() => {
      const reply = { from: "Lucia", text: responses[Math.floor(Math.random() * responses.length)], time: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }), mine: false };
      setThread(t => [...t, reply]);
    }, 1200);
  };

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [thread]);

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-white/10">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase">← Back</button>
        <div className="ml-auto flex items-center gap-1.5">
          <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs" style={{ background: `${PINK}30` }}>💋</div>
          <span className="text-[10px] font-black text-white">Lucia</span>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-2">
        {thread.map((m, i) => (
          <div key={i} className={`flex ${m.mine ? "justify-end" : "justify-start"}`}>
            <div className="max-w-[75%]">
              <div className="px-2.5 py-1.5 rounded-2xl text-[9px] leading-relaxed"
                style={{
                  background: m.mine ? `linear-gradient(135deg, ${PINK}, #b820ff)` : "rgba(255,255,255,0.1)",
                  color: "white",
                  borderRadius: m.mine ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                }}>
                {m.text}
              </div>
              <p className="text-[7px] text-white/20 mt-0.5 px-1" style={{ textAlign: m.mine ? "right" : "left" }}>{m.time}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="flex items-center gap-2 px-3 py-2 border-t border-white/10">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && send()}
          placeholder="Message…"
          className="flex-1 rounded-full px-3 py-1.5 text-[9px] text-white placeholder-white/20 outline-none"
          style={{ background: "rgba(255,255,255,0.07)" }}
        />
        <button onClick={send} className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
          style={{ background: `linear-gradient(135deg, ${PINK}, #b820ff)` }}>
          ↑
        </button>
      </div>
    </div>
  );
}

/* ── Music Screen ── */
function MusicScreen({ onBack }: { onBack: () => void }) {
  const TRACKS = [
    { title: "Thriller", artist: "Michael Jackson", emoji: "🕷️", duration: "5:57" },
    { title: "Stay", artist: "Justin Bieber & The Kid LAROI", emoji: "💙", duration: "2:21" },
    { title: "Blinding Lights", artist: "The Weeknd", emoji: "🌃", duration: "3:20" },
    { title: "APT.", artist: "ROSÉ & Bruno Mars", emoji: "🌹", duration: "3:29" },
    { title: "Espresso", artist: "Sabrina Carpenter", emoji: "☕", duration: "2:55" },
    { title: "Peaches", artist: "Justin Bieber", emoji: "🍑", duration: "3:18" },
    { title: "HUMBLE.", artist: "Kendrick Lamar", emoji: "👑", duration: "2:57" },
    { title: "Levitating", artist: "Dua Lipa", emoji: "✨", duration: "3:23" },
  ];
  const [playing, setPlaying] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(34);

  useEffect(() => {
    if (!isPlaying) return;
    const t = setInterval(() => setProgress(p => p >= 100 ? 0 : p + 0.5), 500);
    return () => clearInterval(t);
  }, [isPlaying]);

  const track = TRACKS[playing];

  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase">← Back</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">Music</span>
      </div>

      {/* Now playing card */}
      <div className="mx-3 mb-3 rounded-2xl p-3" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        <div className="flex items-center gap-3 mb-3">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl shrink-0"
            style={{ background: `linear-gradient(135deg, ${PINK}30, #b820ff30)`, border: `1px solid ${PINK}30` }}>
            {track.emoji}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-black text-white truncate">{track.title}</p>
            <p className="text-[8px] text-white/40 truncate">{track.artist}</p>
          </div>
        </div>
        {/* Progress */}
        <div className="h-0.5 rounded-full bg-white/10 mb-2 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-500"
            style={{ width: `${progress}%`, background: `linear-gradient(to right, ${PINK}, #b820ff)` }} />
        </div>
        {/* Controls */}
        <div className="flex items-center justify-center gap-5">
          <button onClick={() => setPlaying(p => (p - 1 + TRACKS.length) % TRACKS.length)} className="text-white/50 text-sm">⏮</button>
          <button onClick={() => setIsPlaying(v => !v)}
            className="w-9 h-9 rounded-full flex items-center justify-center font-black text-sm"
            style={{ background: `linear-gradient(135deg, ${PINK}, #b820ff)` }}>
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={() => { setPlaying(p => (p + 1) % TRACKS.length); setProgress(0); }} className="text-white/50 text-sm">⏭</button>
        </div>
      </div>

      {/* Playlist */}
      <div className="flex-1 overflow-y-auto px-3 flex flex-col gap-1">
        {TRACKS.map((t, i) => (
          <button key={i} onClick={() => { setPlaying(i); setProgress(0); setIsPlaying(true); }}
            className="flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-left transition-all"
            style={{ background: playing === i ? `${PINK}15` : "rgba(255,255,255,0.03)", border: `1px solid ${playing === i ? PINK + "30" : "transparent"}` }}>
            <span className="text-base">{t.emoji}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[9px] font-bold text-white truncate">{t.title}</p>
              <p className="text-[7px] text-white/30 truncate">{t.artist}</p>
            </div>
            <span className="text-[7px] text-white/20 shrink-0">{t.duration}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

/* ── Maps Screen ── */
function MapsScreen({ onBack }: { onBack: () => void }) {
  return (
    <div className="flex-1 flex flex-col">
      <div className="flex items-center gap-2 px-4 py-2">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase">← Back</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">Maps</span>
      </div>
      <div className="flex-1 relative overflow-hidden mx-3 mb-3 rounded-xl"
        style={{ background: "linear-gradient(160deg, #051525 0%, #0a2035 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Fake map grid */}
        <svg className="absolute inset-0 w-full h-full opacity-20" style={{ strokeWidth: 1 }}>
          {[0,1,2,3,4,5].map(i => (
            <line key={`h${i}`} x1="0" y1={`${i * 20}%`} x2="100%" y2={`${i * 20}%`} stroke={CYAN} />
          ))}
          {[0,1,2,3,4,5,6].map(i => (
            <line key={`v${i}`} x1={`${i * 17}%`} y1="0" x2={`${i * 17}%`} y2="100%" stroke={CYAN} />
          ))}
          {/* Roads */}
          <path d="M0,60 Q50,55 100,50" stroke={CYAN} strokeWidth="3" strokeOpacity="0.6" fill="none" />
          <path d="M30,0 Q35,50 30,100" stroke={CYAN} strokeWidth="2.5" strokeOpacity="0.5" fill="none" />
          <path d="M0,30 Q40,28 70,35 Q90,40 100,38" stroke={CYAN} strokeWidth="2" strokeOpacity="0.4" fill="none" />
          {/* Blocks */}
          <rect x="8%" y="12%" width="18%" height="12%" rx="2" fill={CYAN} fillOpacity="0.08" />
          <rect x="35%" y="8%" width="22%" height="14%" rx="2" fill={CYAN} fillOpacity="0.06" />
          <rect x="65%" y="15%" width="28%" height="18%" rx="2" fill={CYAN} fillOpacity="0.07" />
          <rect x="10%" y="70%" width="16%" height="20%" rx="2" fill={CYAN} fillOpacity="0.08" />
          <rect x="50%" y="65%" width="20%" height="25%" rx="2" fill={CYAN} fillOpacity="0.06" />
        </svg>
        {/* Location pin */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center">
          <div className="w-3 h-3 rounded-full border-2 border-white mb-0.5" style={{ background: PINK, boxShadow: `0 0 12px ${PINK}` }} />
          <div className="w-0.5 h-3 rounded-full" style={{ background: PINK }} />
        </div>
        <div className="absolute bottom-3 left-3 right-3 rounded-lg px-2.5 py-2"
          style={{ background: "rgba(7,7,28,0.85)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <p className="text-[9px] font-black text-white">📍 Chamak Street HQ</p>
          <p className="text-[7px] text-white/40 mt-0.5">Vice City, Leonida · 0.0 mi</p>
        </div>
      </div>
    </div>
  );
}

/* ── Wanted Screen ── */
function WantedScreen({ onBack }: { onBack: () => void }) {
  const [level, setLevel] = useState(3);
  return (
    <div className="flex-1 flex flex-col items-center pt-4 px-4">
      <div className="flex items-center gap-2 w-full mb-4">
        <button onClick={onBack} className="text-white/50 text-[9px] uppercase">← Back</button>
        <span className="text-[10px] font-black uppercase tracking-widest text-white/60 ml-auto">Wanted Level</span>
      </div>
      <div className="flex gap-1.5 mb-6">
        {[1,2,3,4,5].map(s => (
          <button key={s} onClick={() => setLevel(s)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl transition-all"
            style={{ background: s <= level ? "#e74c3c30" : "rgba(255,255,255,0.05)", border: `1px solid ${s <= level ? "#e74c3c" : "rgba(255,255,255,0.1)"}` }}>
            {s <= level ? "⭐" : "☆"}
          </button>
        ))}
      </div>
      <div className="text-center mb-4">
        <p className="text-white font-black text-sm mb-1">
          {level === 1 ? "Low Profile" : level === 2 ? "Suspicious" : level === 3 ? "Wanted" : level === 4 ? "Manhunt" : "MOST WANTED"}
        </p>
        <p className="text-white/30 text-[9px]">Vice City PD Alert Level {level}</p>
      </div>
      <div className="w-full rounded-xl p-3" style={{ background: "rgba(231,76,60,0.1)", border: "1px solid rgba(231,76,60,0.2)" }}>
        <p className="text-[9px] text-white/60 leading-relaxed text-center">
          {level <= 2 ? "Officers dispatched. Keep moving." : level === 3 ? "Police helicopter deployed. BOLO issued." : level === 4 ? "SWAT teams mobilized. High-value target." : "Army deployed. Chamak Street locked down. 🚁"}
        </p>
      </div>
    </div>
  );
}

/* ── Main Phone Component ── */
interface PhoneProps {
  onClose: () => void;
  triggerCall?: boolean;
}

export function GTA6Phone({ onClose, triggerCall = false }: PhoneProps) {
  const [screen, setScreen] = useState<PhoneScreen>("locked");
  const [callTimer, setCallTimer] = useState(0);
  const callRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const time = usePhoneClock();
  const { settings, update } = usePhoneSettings();

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

  // Save captured photo to gallery
  const handleCapture = (dataUrl: string) => {
    setCapturedPhoto(dataUrl);
    const stored: string[] = (() => {
      try { return JSON.parse(localStorage.getItem("phone_gallery") ?? "[]"); } catch { return []; }
    })();
    localStorage.setItem("phone_gallery", JSON.stringify([dataUrl, ...stored].slice(0, 20)));
    setScreen("camera-review");
  };

  const formatTimer = (s: number) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
  const accent = WALLPAPER_ACCENTS[settings.wallpaper];
  const SCREEN_BG = WALLPAPERS[settings.wallpaper];

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
          boxShadow: `0 40px 100px rgba(0,0,0,0.8), 0 0 60px ${accent}22, inset 0 1px 0 rgba(255,255,255,0.08)`,
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
              <span className="text-[8px] text-white/50">6G</span>
              <span className="text-[8px] text-white/60">🔋</span>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {/* ── LOCKED ── */}
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
                  style={{ background: `${accent}25`, border: `1px solid ${accent}50` }}>
                  Unlock
                </motion.button>
              </motion.div>
            )}

            {/* ── HOME ── */}
            {screen === "home" && (
              <motion.div key="home"
                className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <div className="flex-1 relative px-4 pt-2">
                  <div className="text-center mb-4">
                    <span className="text-[8px] font-black uppercase tracking-[0.35em]"
                      style={{ color: accent, textShadow: `0 0 10px ${accent}` }}>GTA VI</span>
                    <div className="text-xs text-white/30 mt-0.5">State of Leonida</div>
                  </div>
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
                          style={{ background: `linear-gradient(145deg, ${app.color}cc, ${app.color}66)`, boxShadow: `0 4px 12px ${app.color}44` }}>
                          {app.icon}
                        </div>
                        <span className="text-[7px] text-white/60 font-medium">{app.label}</span>
                      </motion.button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-xl px-3 py-2.5" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-base">🎮</span>
                      <div>
                        <p className="text-[9px] font-black text-white">Chamak Street</p>
                        <p className="text-[8px] text-white/50">Welcome to Vice City, bro. 🔥</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mx-4 mb-3 rounded-2xl px-4 py-2 flex justify-around"
                  style={{ background: "rgba(255,255,255,0.06)", backdropFilter: "blur(10px)" }}>
                  {["📞","📧","🌐","📷"].map((icon, i) => (
                    <button key={i}
                      onClick={() => i === 3 ? setScreen("camera") : undefined}
                      className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
                      style={{ background: "rgba(255,255,255,0.08)" }}>
                      {icon}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* ── CAMERA ── */}
            {screen === "camera" && (
              <motion.div key="camera" className="flex-1 flex flex-col"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <CameraScreen onCapture={handleCapture} onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── CAMERA REVIEW ── */}
            {screen === "camera-review" && capturedPhoto && (
              <motion.div key="camera-review" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <CameraReviewScreen
                  photo={capturedPhoto}
                  onBack={() => setScreen("camera")}
                  onSubmit={() => setScreen("home")}
                />
              </motion.div>
            )}

            {/* ── GALLERY ── */}
            {screen === "gallery" && (
              <motion.div key="gallery" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <GalleryScreen onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── SETTINGS ── */}
            {screen === "settings" && (
              <motion.div key="settings" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <SettingsScreen settings={settings} update={update} onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── CONTACTS ── */}
            {screen === "contacts" && (
              <motion.div key="contacts" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <ContactsScreen onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── MESSAGES ── */}
            {screen === "messages" && (
              <motion.div key="messages" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <MessagesScreen onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── MUSIC ── */}
            {screen === "music" && (
              <motion.div key="music" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <MusicScreen onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── MAPS ── */}
            {screen === "maps" && (
              <motion.div key="maps" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <MapsScreen onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── WANTED ── */}
            {screen === "wanted" && (
              <motion.div key="wanted" className="flex-1 flex flex-col"
                initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}>
                <WantedScreen onBack={() => setScreen("home")} />
              </motion.div>
            )}

            {/* ── INCOMING CALL ── */}
            {screen === "call-incoming" && (
              <motion.div key="call-incoming"
                className="flex-1 flex flex-col items-center pt-6 pb-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-[9px] font-black uppercase tracking-[0.3em] text-white/40 mb-4">Incoming Call</div>
                <motion.div
                  animate={{ scale: [1, 1.04, 1] }}
                  transition={{ duration: 1.2, repeat: Infinity }}
                  className="relative mb-4"
                >
                  <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white/20"
                    style={{ boxShadow: `0 0 0 6px ${CYAN}20, 0 0 0 12px ${CYAN}10` }}>
                    <div className="w-full h-full flex items-center justify-center text-4xl"
                      style={{ background: `linear-gradient(135deg, ${CYAN}30, ${PINK}30)` }}>🎮</div>
                  </div>
                  {[0,1,2].map(i => (
                    <motion.div key={i} className="absolute inset-0 rounded-full border border-white/20"
                      animate={{ scale: [1, 1.8 + i * 0.4], opacity: [0.4, 0] }}
                      transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.4 }} />
                  ))}
                </motion.div>
                <p className="text-white font-black text-base tracking-wide mb-1">Chamak Street</p>
                <p className="text-white/40 text-[10px] mb-5">+971 00 000 0000</p>
                <div className="flex items-end gap-0.5 h-5 mb-6">
                  {Array.from({length: 16}, (_, i) => (
                    <div key={i} className="w-1 rounded-full" style={{ background: CYAN, animation: `eqBounce ${0.4 + (i % 4) * 0.1}s ${i * 0.05}s ease-in-out infinite alternate`, height: `${30 + Math.abs(Math.sin(i)) * 70}%` }} />
                  ))}
                </div>
                <div className="flex gap-10 mt-auto px-6">
                  <motion.button onClick={() => setScreen("call-ended")} whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: "#e74c3c", boxShadow: "0 4px 20px #e74c3c66" }}>📵</div>
                    <span className="text-[8px] text-white/40 uppercase tracking-widest">Decline</span>
                  </motion.button>
                  <motion.button onClick={() => setScreen("call-active")} whileTap={{ scale: 0.9 }}
                    className="flex flex-col items-center gap-1.5">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
                      style={{ background: "#2ecc71", boxShadow: "0 4px 20px #2ecc7166" }}>📞</div>
                    <span className="text-[8px] text-white/40 uppercase tracking-widest">Answer</span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* ── ACTIVE CALL ── */}
            {screen === "call-active" && (
              <motion.div key="call-active"
                className="flex-1 flex flex-col items-center pt-8 pb-4"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="text-[9px] text-white/40 uppercase tracking-widest mb-2">Connected</div>
                <div className="w-16 h-16 rounded-full flex items-center justify-center text-3xl mb-3"
                  style={{ background: `linear-gradient(135deg, ${CYAN}30, ${PINK}30)`, border: `1px solid ${CYAN}40` }}>🎮</div>
                <p className="text-white font-black text-sm">Chamak Street</p>
                <p className="text-white/40 text-xs mt-1 font-mono">{formatTimer(callTimer)}</p>
                <div className="flex items-center gap-0.5 h-8 my-4">
                  {Array.from({length: 20}, (_, i) => (
                    <div key={i} className="w-0.5 rounded-full"
                      style={{ background: `linear-gradient(to top, ${CYAN}, ${PINK})`, animation: `eqBounce ${0.3 + (i % 5) * 0.1}s ${i * 0.04}s ease-in-out infinite alternate`, height: `${20 + Math.abs(Math.sin(i * 0.8)) * 80}%` }} />
                  ))}
                </div>
                <div className="rounded-xl px-4 py-3 text-center mx-4 mb-4"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  <p className="text-white/60 text-[9px] leading-relaxed italic">
                    "Welcome to Chamak Street — Dubai's finest streetwear. New drop just landed. Stay fresh, stay iced."
                  </p>
                </div>
                <motion.button onClick={() => setScreen("call-ended")} whileTap={{ scale: 0.9 }}
                  className="w-14 h-14 rounded-full flex items-center justify-center text-2xl mt-auto"
                  style={{ background: "#e74c3c", boxShadow: "0 4px 20px #e74c3c66" }}>📵</motion.button>
                <span className="text-[8px] text-white/30 uppercase tracking-widest mt-1.5">End Call</span>
              </motion.div>
            )}

            {/* ── CALL ENDED ── */}
            {screen === "call-ended" && (
              <motion.div key="call-ended"
                className="flex-1 flex flex-col items-center justify-center gap-3"
                initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <span className="text-4xl">👋</span>
                <p className="text-white/60 text-[10px] uppercase tracking-widest">Call Ended</p>
                <motion.button onClick={() => setScreen("home")} whileTap={{ scale: 0.96 }}
                  className="mt-2 px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest text-white"
                  style={{ background: `linear-gradient(135deg, ${PINK}, ${CYAN})` }}>
                  Home
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Home indicator */}
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
