import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Check, X } from "lucide-react";
import { ChamakLogo } from "./chamak-logo";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Step = "name" | "pfp";

export default function AdminNamePrompt() {
  const [show, setShow] = useState(false);
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingPfp, setSavingPfp] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [adminId] = useState(() => {
    let id = localStorage.getItem("fp_admin_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("fp_admin_id", id); }
    return id;
  });

  useEffect(() => {
    const savedName = localStorage.getItem("fp_admin_name");
    const savedPfp = localStorage.getItem("fp_admin_pfp");
    if (!savedName) { setStep("name"); setShow(true); return; }
    if (!savedPfp) { setStep("pfp"); setShow(true); return; }
    // Silently re-verify with server
    fetch(`${BASE}/api/admin/profile/${adminId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { display_name?: string } | null) => {
        if (!data?.display_name) { setStep("name"); setShow(true); }
      })
      .catch(() => {});
  }, [adminId]);

  /* ── Save name ─────────────────────────────────────────────────────── */
  const saveName = async () => {
    if (!name.trim() || name.trim().length < 2) { setError("Name must be at least 2 characters"); return; }
    setSaving(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/admin/profile`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, displayName: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: string };
        setError(data.error ?? "Failed to save"); return;
      }
      localStorage.setItem("fp_admin_name", name.trim());
      setStep("pfp");
    } catch { setError("Network error"); } finally { setSaving(false); }
  };

  /* ── Save pfp ──────────────────────────────────────────────────────── */
  const savePfp = async (pfpData: string) => {
    setSavingPfp(true);
    try {
      localStorage.setItem("fp_admin_pfp", pfpData);
      await fetch(`${BASE}/api/admin/profile/pfp`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId, pfpData }),
      }).catch(() => {});
      window.dispatchEvent(new Event("firstpick-admin-pfp-updated"));
      setShow(false);
    } finally { setSavingPfp(false); }
  };

  /* ── File picker ───────────────────────────────────────────────────── */
  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const SIZE = 200;
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext("2d")!;
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, SIZE, SIZE);
        setPreview(canvas.toDataURL("image/jpeg", 0.82));
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  const SPRING = { type: "spring" as const, stiffness: 300, damping: 28 };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="overlay"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
        >
          <motion.div
            key={step}
            initial={{ scale: 0.88, y: 24, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.88, y: 24, opacity: 0 }}
            transition={SPRING}
            className="w-full max-w-sm rounded-3xl border border-white/10 p-8 text-center space-y-6"
            style={{ background: "rgba(10,10,10,0.98)", backdropFilter: "blur(40px)", boxShadow: "0 0 80px rgba(255,102,0,0.15), 0 25px 50px rgba(0,0,0,0.85)" }}
          >
            {/* ── STEP: name ──────────────────────────────────────────── */}
            {step === "name" && (
              <>
                {/* Logo */}
                <div className="flex justify-center">
                  <div className="px-5 py-3 rounded-2xl border border-primary/20 bg-primary/8"
                    style={{ background: "rgba(255,102,0,0.07)" }}>
                    <ChamakLogo size="md" />
                  </div>
                </div>

                <div>
                  <h2 className="font-black text-2xl mb-2">What's your name?</h2>
                  <p className="text-muted-foreground text-sm">So other admins know who you are in the team chat.</p>
                </div>

                <div className="space-y-3">
                  <input
                    value={name}
                    onChange={e => { setName(e.target.value); setError(""); }}
                    onKeyDown={e => e.key === "Enter" && saveName()}
                    placeholder="Your name…"
                    className="w-full px-4 py-3.5 text-center text-lg font-bold bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40 transition-colors"
                    autoFocus
                  />
                  {error && <p className="text-xs text-red-400">{error}</p>}
                </div>

                <button onClick={saveName} disabled={saving || !name.trim()}
                  className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-base hover:opacity-90 disabled:opacity-40 transition-opacity">
                  {saving ? "Saving…" : "Continue →"}
                </button>

                <p className="text-[11px] text-muted-foreground/40">You can change your name in admin every 7 days.</p>
              </>
            )}

            {/* ── STEP: pfp ───────────────────────────────────────────── */}
            {step === "pfp" && (
              <>
                {/* Logo */}
                <div className="flex justify-center">
                  <div className="px-5 py-3 rounded-2xl border border-primary/20"
                    style={{ background: "rgba(255,102,0,0.07)" }}>
                    <ChamakLogo size="md" />
                  </div>
                </div>

                <div>
                  <h2 className="font-black text-2xl mb-2">Profile picture</h2>
                  <p className="text-muted-foreground text-sm">How other admins see you in the chat.</p>
                </div>

                {/* No preview yet — show two choices */}
                {!preview ? (
                  <div className="grid grid-cols-2 gap-3">
                    {/* Option 1: FP Logo */}
                    <button
                      onClick={() => savePfp("fp_logo")}
                      disabled={savingPfp}
                      className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-white/10 hover:border-primary/40 bg-white/3 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-14 h-14 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center">
                        <span className="font-black text-lg text-primary">FP</span>
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">FP Logo</span>
                    </button>

                    {/* Option 2: Upload photo */}
                    <button
                      onClick={() => fileRef.current?.click()}
                      className="flex flex-col items-center gap-3 p-4 rounded-2xl border border-dashed border-white/15 hover:border-primary/40 bg-white/3 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-14 h-14 rounded-xl bg-white/5 flex items-center justify-center">
                        <Camera size={22} className="text-muted-foreground" />
                      </div>
                      <span className="text-xs font-bold text-muted-foreground">Custom Photo</span>
                    </button>
                    <input ref={fileRef} type="file" accept="image/*" hidden onChange={handleFile} />
                  </div>
                ) : (
                  /* Photo preview */
                  <div className="flex flex-col items-center gap-4">
                    <img src={preview} alt="preview" className="w-24 h-24 rounded-full object-cover border-2 border-primary/40" />
                    <div className="flex gap-2 w-full">
                      <button onClick={() => { setPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                        className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm font-bold text-muted-foreground hover:border-white/25 transition-colors">
                        Retake
                      </button>
                      <button onClick={() => savePfp(preview)} disabled={savingPfp}
                        className="flex-1 py-2.5 rounded-xl bg-primary text-white text-sm font-black hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center justify-center gap-1">
                        {savingPfp ? "Saving…" : <><Check size={15} /> Save</>}
                      </button>
                    </div>
                  </div>
                )}

                <button onClick={() => { localStorage.setItem("fp_admin_pfp", "fp_logo"); window.dispatchEvent(new Event("firstpick-admin-pfp-updated")); setShow(false); }}
                  className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors flex items-center gap-1 mx-auto">
                  <X size={11} /> Skip for now
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
