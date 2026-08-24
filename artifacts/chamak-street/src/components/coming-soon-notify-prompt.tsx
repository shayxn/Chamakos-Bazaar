import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = "=".repeat((4 - (b64.length % 4)) % 4);
  const base64 = (b64 + pad).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

interface Props {
  productName: string;
  onClose: () => void;
}

export function ComingSoonNotifyPrompt({ productName, onClose }: Props) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const { toast } = useToast();

  const subscribe = async () => {
    if (loading) return;
    setLoading(true);
    try {
      if (typeof Notification === "undefined" || !("serviceWorker" in navigator)) {
        toast({
          title: "Add to Home Screen first",
          description: "Open FirstPick in Safari → Share → Add to Home Screen, then try again.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        toast({ title: "Permission denied", description: "Enable notifications in your device settings.", variant: "destructive" });
        setLoading(false);
        return;
      }
      const vapidRes = await fetch(`${BASE}/api/push/vapid-public-key`, { credentials: "include" });
      const { publicKey } = await vapidRes.json() as { publicKey: string };
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });
      const json = sub.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
      await fetch(`${BASE}/api/push/wishlist-notify-subscribe`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth }),
      });
      setDone(true);
      setTimeout(onClose, 2200);
    } catch (e) {
      toast({ title: "Setup failed", description: String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end"
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 420, damping: 38 }}
        className="relative w-full rounded-t-3xl border-t border-white/10 overflow-hidden"
        style={{
          background: "linear-gradient(180deg, rgba(14,7,28,0.99) 0%, rgba(6,3,15,1) 100%)",
          paddingBottom: "max(env(safe-area-inset-bottom, 0px), 24px)",
        }}
      >
        {/* Orange aurora glow */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-80 h-40 rounded-full"
            style={{ background: "radial-gradient(ellipse, rgba(255,102,0,0.12) 0%, transparent 70%)", filter: "blur(20px)" }} />
        </div>

        <div className="relative p-6">
          <div className="w-10 h-1 rounded-full bg-white/20 mx-auto mb-6" />

          <AnimatePresence mode="wait">
            {done ? (
              <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="flex flex-col items-center py-4 text-center">
                <motion.div
                  initial={{ scale: 0 }} animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 300, damping: 20 }}
                  className="w-16 h-16 rounded-full flex items-center justify-center mb-4"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 0 40px rgba(34,197,94,0.3)" }}>
                  <Check className="w-7 h-7 text-white" strokeWidth={3} />
                </motion.div>
                <h3 className="text-xl font-black uppercase">You're In! 🔥</h3>
                <p className="text-muted-foreground text-sm mt-1">
                  We'll ping you the moment <span className="text-primary font-bold">{productName}</span> drops.
                </p>
              </motion.div>
            ) : (
              <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border"
                    style={{ background: "rgba(255,102,0,0.12)", borderColor: "rgba(255,102,0,0.25)" }}>
                    <Bell className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-black text-lg leading-tight">Get Notified When It Drops 🔥</h3>
                    <p className="text-muted-foreground text-sm mt-1">
                      <span className="text-white font-bold">{productName}</span> isn't out yet — enable notifications and be first to cop.
                    </p>
                  </div>
                  <button onClick={onClose} className="text-muted-foreground hover:text-white shrink-0 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={subscribe}
                  disabled={loading}
                  className="w-full py-4 rounded-2xl font-black text-sm uppercase tracking-wide text-white flex items-center justify-center gap-2 disabled:opacity-60 transition-opacity"
                  style={{ background: "linear-gradient(135deg, #ff6600, #ffaa00)", boxShadow: "0 8px 32px rgba(255,102,0,0.35)", touchAction: "manipulation" }}>
                  {loading ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                  ) : (
                    <><Bell className="w-4 h-4" /> Notify Me When It's Live</>
                  )}
                </motion.button>

                <button onClick={onClose}
                  className="w-full mt-3 py-3 text-sm font-bold text-muted-foreground hover:text-white transition-colors"
                  style={{ touchAction: "manipulation" }}>
                  No thanks
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}
