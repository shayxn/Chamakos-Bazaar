import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function AdminNamePrompt() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState("");
  const [adminId] = useState(() => {
    let id = localStorage.getItem("fp_admin_id");
    if (!id) { id = crypto.randomUUID(); localStorage.setItem("fp_admin_id", id); }
    return id;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    // Check if this admin has a name set
    const saved = localStorage.getItem("fp_admin_name");
    if (!saved) { setShow(true); return; }
    // Verify with server
    fetch(`${BASE}/api/admin/profile/${adminId}`, { credentials: "include" })
      .then(r => r.ok ? r.json() : null)
      .then((data: { display_name?: string } | null) => { if (!data?.display_name) setShow(true); })
      .catch(() => {});
  }, [adminId]);

  const save = async () => {
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
      setShow(false);
    } catch { setError("Network error"); } finally { setSaving(false); }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <motion.div initial={{ scale: 0.8, y: 30 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.8, y: 30 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="w-full max-w-sm rounded-3xl border border-white/12 p-8 text-center space-y-6"
            style={{ background: "rgba(12,12,12,0.98)", backdropFilter: "blur(40px)", boxShadow: "0 0 80px rgba(255,102,0,0.15), 0 25px 50px rgba(0,0,0,0.8)" }}>
            {/* Logo */}
            <div className="w-16 h-16 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center mx-auto">
              <span className="text-2xl font-black text-primary">FP</span>
            </div>
            <div>
              <h2 className="font-black text-2xl mb-2">What's your name?</h2>
              <p className="text-muted-foreground text-sm">So other admins know who you are in the team chat.</p>
            </div>
            <div className="space-y-3">
              <input
                value={name} onChange={e => { setName(e.target.value); setError(""); }}
                onKeyDown={e => e.key === "Enter" && save()}
                placeholder="Your name…"
                className="w-full px-4 py-3.5 text-center text-lg font-bold bg-white/5 border border-white/12 rounded-2xl focus:outline-none focus:border-primary/50 placeholder:text-muted-foreground/40 transition-colors"
                autoFocus
              />
              {error && <p className="text-xs text-red-400">{error}</p>}
            </div>
            <button onClick={save} disabled={saving || !name.trim()}
              className="w-full py-3.5 rounded-2xl bg-primary text-white font-black text-base hover:opacity-90 disabled:opacity-40 transition-opacity">
              {saving ? "Saving…" : "Continue →"}
            </button>
            <p className="text-[11px] text-muted-foreground/50">You can change your name in admin every 7 days.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
