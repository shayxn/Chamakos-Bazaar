import React, { useEffect, useState, useRef } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { motion } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, ShoppingCart, Loader2 } from "lucide-react";
import gameVideo from "@assets/ScreenRecording_06-26-2026_09-43-06_1_1782476344444.mov";
import gameMusic from "@assets/GTA_6_-_Official_Main_Theme_Music_1782476132021.mp3";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

type Game = {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  isPreOrder: boolean;
  preOrderDate: string | null;
  preOrderPrice: number | null;
  preOrderButtonText: string | null;
  isActive: boolean;
  animationEnabled: boolean;
};

export default function GameDetail() {
  const [, params] = useRoute("/games/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(true);
  const [adding, setAdding] = useState(false);
  const [added, setAdded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/games/${id}`)
      .then((r) => r.json())
      .then((data) => { setGame(data as Game); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.muted = muted;
    if (audioRef.current) {
      audioRef.current.muted = muted;
      if (!muted) {
        audioRef.current.play().catch(() => {});
      } else {
        audioRef.current.pause();
      }
    }
  }, [muted]);

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
  }, []);

  const handlePreOrder = async () => {
    if (!game || adding || added) return;
    setAdding(true);
    try {
      const res = await fetch(`${BASE}/api/games/${game.id}/preorder-cart`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (res.ok) {
        setAdded(true);
        setTimeout(() => navigate("/cart"), 600);
      }
    } catch {
      setAdding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white font-black uppercase tracking-widest text-sm">Loading…</motion.div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center text-white">
        <div className="text-center">
          <p className="font-black uppercase text-xl mb-4">Game not found</p>
          <Link href="/games"><button className="px-6 py-3 border border-white/20 rounded text-sm">← Back</button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Hidden audio - plays GTA theme when unmuted */}
      <audio ref={audioRef} src={gameMusic} loop preload="auto" muted />

      {/* Nav */}
      <div className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-5 py-4">
        <Link href="/games">
          <button className="flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm font-bold">
            <ArrowLeft className="h-4 w-4" /> Games
          </button>
        </Link>
        <motion.button
          onClick={() => setMuted((m) => !m)}
          whileTap={{ scale: 0.88 }}
          className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors relative"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
          {!muted && (
            <motion.span
              className="absolute inset-0 rounded-full border border-white/40"
              animate={{ scale: [1, 1.5, 1], opacity: [0.6, 0, 0.6] }}
              transition={{ duration: 1.8, repeat: Infinity }}
            />
          )}
        </motion.button>
      </div>

      {/* Video */}
      <div className="w-full flex-1 flex flex-col">
        <video
          ref={videoRef}
          src={gameVideo}
          autoPlay
          muted={muted}
          loop
          playsInline
          controls={false}
          disablePictureInPicture
          className="w-full block"
          style={{
            maxHeight: "62vh",
            objectFit: "cover",
            WebkitAppearance: "none",
          }}
        />

        {/* Pre-Order Button */}
        <div className="flex flex-col items-center justify-center py-8 px-6 gap-4" style={{ background: "#0a0a12" }}>
          {game.preOrderPrice != null && (
            <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, ease: EASE }}
              className="text-white/50 text-sm font-bold uppercase tracking-widest">
              AED {game.preOrderPrice.toFixed(2)} · {game.preOrderDate ?? "Coming 2025"}
            </motion.p>
          )}

          <motion.button
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, ease: EASE }}
            whileHover={{ scale: adding || added ? 1 : 1.04 }}
            whileTap={{ scale: adding || added ? 1 : 0.97 }}
            onClick={handlePreOrder}
            disabled={adding || added}
            className="flex items-center gap-3 px-12 py-5 font-black uppercase tracking-widest text-base text-white rounded-full transition-all disabled:cursor-default"
            style={{
              background: added
                ? "#22c55e"
                : "linear-gradient(135deg, #e8405a 0%, #c020e0 50%, #6040f0 100%)",
              boxShadow: added
                ? "0 0 30px rgba(34,197,94,0.4)"
                : "0 0 40px rgba(232,64,90,0.5), 0 0 80px rgba(192,32,224,0.2)",
              minWidth: 260,
              justifyContent: "center",
            }}
          >
            {adding ? (
              <><Loader2 className="h-5 w-5 animate-spin" /> Adding…</>
            ) : added ? (
              <><ShoppingCart className="h-5 w-5" /> Added to Cart!</>
            ) : (
              <><ShoppingCart className="h-5 w-5" /> {game.preOrderButtonText || "Pre-Order Now"}</>
            )}
          </motion.button>

          {game.description && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
              className="text-white/35 text-xs text-center max-w-sm leading-relaxed">
              {game.description}
            </motion.p>
          )}

          {/* Music hint */}
          {muted && (
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
              className="text-white/25 text-xs flex items-center gap-1.5">
              <Volume2 className="h-3 w-3" /> Tap the sound icon for the full experience
            </motion.p>
          )}
        </div>
      </div>
    </div>
  );
}
