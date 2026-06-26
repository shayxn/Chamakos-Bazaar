import { useEffect, useState, useRef } from "react";
import { useRoute, Link } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Volume2, VolumeX, ShoppingBag, Clock, Star, Gamepad2, Play, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

import gtaVideo from "@assets/ScreenRecording_06-26-2026_11-41-12_1_1782459727189.mp4";
import gtaAltVideo from "@assets/ScreenRecording_06-26-2026_09-43-06_1_1782459766388.mp4";
import gtaMusic from "@assets/GTA_6_-_Official_Main_Theme_Music_1782459811057.mp3";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Game = {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  videoUrl: string | null;
  musicUrl: string | null;
  platform: string | null;
  genre: string | null;
  isPreOrder: boolean;
  preOrderDate: string | null;
  preOrderPrice: number | null;
  preOrderNote: string | null;
  preOrderButtonText: string | null;
  isActive: boolean;
  animationEnabled: boolean;
};

const EASE = [0.16, 1, 0.3, 1] as const;

const GTA_GAME_ID = 1;

function isGtaGame(game: Game) {
  return (
    game.name.toLowerCase().includes("grand theft auto") ||
    game.name.toLowerCase().includes("gta") ||
    game.id === GTA_GAME_ID
  );
}

export default function GameDetail() {
  const [, params] = useRoute("/games/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const [game, setGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [muted, setMuted] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [animationPhase, setAnimationPhase] = useState<"loading" | "playing" | "reveal">("loading");
  const [ordered, setOrdered] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (!id) return;
    fetch(`${BASE}/api/games/${id}`)
      .then((r) => r.json())
      .then((data) => {
        setGame(data as Game);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!game || !game.animationEnabled) {
      setAnimationPhase("reveal");
      return;
    }
    const t1 = setTimeout(() => setAnimationPhase("playing"), 400);
    return () => clearTimeout(t1);
  }, [game]);

  useEffect(() => {
    if (animationPhase === "playing" && videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  }, [animationPhase]);

  useEffect(() => {
    if (animationPhase === "playing" && audioRef.current && game?.animationEnabled) {
      audioRef.current.volume = 0.6;
      audioRef.current.play().catch(() => {});
    }
  }, [animationPhase, game]);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.muted = muted;
    }
    if (videoRef.current) {
      videoRef.current.muted = true;
    }
  }, [muted]);

  const handlePreOrder = () => {
    setOrdered(true);
    toast({
      title: "Pre-Order Received!",
      description: `Your pre-order for ${game?.name} has been received. We'll contact you via WhatsApp.`,
    });
  };

  const isGta = game ? isGtaGame(game) : false;

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <motion.div
          animate={{ opacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-white font-black uppercase tracking-widest text-sm"
        >
          Loading…
        </motion.div>
      </div>
    );
  }

  if (!game) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="font-black uppercase">Game not found</p>
          <Link href="/games">
            <Button variant="outline" className="mt-4">← Back to Games</Button>
          </Link>
        </div>
      </div>
    );
  }

  const showAnimation = game.animationEnabled && isGta;
  const videoSrc = isGta ? gtaVideo : (game.videoUrl ?? undefined);
  const altVideoSrc = isGta ? gtaAltVideo : undefined;
  const musicSrc = isGta ? gtaMusic : (game.musicUrl ?? undefined);

  if (showAnimation && animationPhase !== "reveal") {
    return (
      <div className="fixed inset-0 bg-black z-50 overflow-hidden">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="absolute top-6 left-6 z-50"
        >
          <Link href="/games">
            <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-bold">
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
          </Link>
        </motion.div>

        {/* Sound toggle */}
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          onClick={() => setMuted(!muted)}
          className="absolute top-6 right-6 z-50 w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-colors"
        >
          {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
        </motion.button>

        {/* Video */}
        <AnimatePresence>
          {animationPhase === "playing" && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1.5, ease: EASE }}
              className="absolute inset-0"
            >
              <video
                ref={videoRef}
                src={videoSrc}
                className="w-full h-full object-cover"
                muted
                playsInline
                onEnded={() => setAnimationPhase("reveal")}
                onCanPlay={() => setVideoReady(true)}
              />
              {/* Skip button */}
              <motion.button
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 3 }}
                onClick={() => setAnimationPhase("reveal")}
                className="absolute bottom-8 right-8 text-white/60 hover:text-white text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-colors"
              >
                Skip <ChevronDown className="h-3.5 w-3.5 rotate-[-90deg]" />
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading state */}
        {!videoReady && animationPhase === "playing" && (
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.div
              animate={{ opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white/50 font-black uppercase tracking-widest text-xs"
            >
              Loading…
            </motion.div>
          </div>
        )}

        {/* Music */}
        {musicSrc && (
          <audio ref={audioRef} src={musicSrc} loop preload="auto" />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Hidden audio for music after animation */}
      {musicSrc && game.animationEnabled && (
        <audio ref={audioRef} src={musicSrc} loop preload="auto" autoPlay />
      )}

      {/* Hero Section */}
      <div className="relative min-h-screen flex items-end overflow-hidden">
        {/* Background video / image */}
        {altVideoSrc || videoSrc ? (
          <video
            src={altVideoSrc ?? videoSrc}
            autoPlay
            muted
            loop
            playsInline
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : game.coverImage ? (
          <img
            src={game.coverImage}
            alt={game.name}
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
        ) : null}

        {/* Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-black/20" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-transparent to-transparent" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom,rgba(255,102,0,0.08),transparent_60%)]" />

        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
          <Link href="/games">
            <button className="flex items-center gap-2 text-white/70 hover:text-white transition-colors text-sm font-bold">
              <ArrowLeft className="h-4 w-4" />
              Games
            </button>
          </Link>
          <div className="flex items-center gap-3">
            {musicSrc && game.animationEnabled && (
              <button
                onClick={() => setMuted(!muted)}
                className="w-9 h-9 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 transition-colors"
              >
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-5xl mx-auto px-6 pb-16 md:pb-24">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: EASE }}
          >
            {/* Platform & genre */}
            <div className="flex items-center gap-3 mb-4">
              {game.platform && (
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50 border border-white/20 px-2 py-0.5 rounded-sm">
                  {game.platform}
                </span>
              )}
              {game.genre && (
                <span className="text-[10px] font-black uppercase tracking-widest text-white/50">
                  {game.genre}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-5xl md:text-7xl lg:text-8xl font-black uppercase tracking-tighter leading-none mb-6">
              {game.name}
            </h1>

            {/* Description */}
            {game.description && (
              <p className="text-white/70 text-base md:text-lg max-w-xl leading-relaxed mb-8">
                {game.description}
              </p>
            )}

            {/* Pre-Order Block */}
            {game.isPreOrder && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: EASE }}
                className="space-y-5"
              >
                {/* Pre-Order Info */}
                <div className="flex flex-wrap items-center gap-6">
                  {game.preOrderDate && (
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      <div>
                        <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                          Release Date
                        </p>
                        <p className="text-white font-black text-sm">{game.preOrderDate}</p>
                      </div>
                    </div>
                  )}
                  {game.preOrderPrice != null && (
                    <div>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-white/40">
                        Price
                      </p>
                      <p className="text-2xl font-black font-mono text-primary">
                        AED {game.preOrderPrice.toFixed(2)}
                      </p>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="h-3.5 w-3.5 fill-primary text-primary" />
                    ))}
                    <span className="text-xs text-white/40 ml-1">Highest Rated</span>
                  </div>
                </div>

                {/* Pre-Order Note */}
                {game.preOrderNote && (
                  <p className="text-white/50 text-xs max-w-md leading-relaxed border-l-2 border-primary/40 pl-3">
                    {game.preOrderNote}
                  </p>
                )}

                {/* Pre-Order Button */}
                <div className="flex flex-wrap gap-3 items-center">
                  <motion.button
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={handlePreOrder}
                    disabled={ordered}
                    className={`flex items-center gap-3 px-8 py-4 font-black uppercase tracking-widest text-sm transition-all rounded-sm ${
                      ordered
                        ? "bg-green-500 text-black cursor-default"
                        : "bg-primary text-black hover:bg-primary/90 hover:shadow-[0_0_40px_rgba(255,102,0,0.5)]"
                    }`}
                  >
                    <ShoppingBag className="h-5 w-5" />
                    {ordered
                      ? "Pre-Order Received!"
                      : (game.preOrderButtonText || "Pre-Order Now")}
                  </motion.button>

                  <a
                    href={`https://wa.me/971521142341?text=I want to pre-order ${encodeURIComponent(game.name)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 px-6 py-4 border border-white/20 text-white font-bold uppercase tracking-wider text-sm hover:border-white/40 transition-colors rounded-sm"
                  >
                    <svg viewBox="0 0 24 24" className="h-4 w-4 fill-[#25D366]">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                    </svg>
                    WhatsApp
                  </a>
                </div>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Scroll indicator */}
        {game.description && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.5 }}
            className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-1"
          >
            <motion.div
              animate={{ y: [0, 6, 0] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
            >
              <ChevronDown className="h-5 w-5 text-white/30" />
            </motion.div>
          </motion.div>
        )}
      </div>

      {/* About Section */}
      {game.description && (
        <div className="bg-black border-t border-white/5 py-20">
          <div className="max-w-4xl mx-auto px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <h2 className="text-2xl font-black uppercase tracking-tighter mb-6 text-white/90">
                About the Game
              </h2>
              <p className="text-white/60 text-base leading-relaxed">{game.description}</p>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
