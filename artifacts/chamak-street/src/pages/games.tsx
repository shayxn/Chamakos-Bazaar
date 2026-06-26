import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";
import { PageTransition } from "@/components/page-transition";
import { Gamepad2, ChevronRight, Clock, ShoppingBag } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Game = {
  id: number;
  name: string;
  description: string | null;
  coverImage: string | null;
  platform: string | null;
  genre: string | null;
  isPreOrder: boolean;
  preOrderDate: string | null;
  preOrderPrice: number | null;
  preOrderButtonText: string | null;
  isActive: boolean;
  animationEnabled: boolean;
  displayOrder: number;
};

const EASE = [0.16, 1, 0.3, 1] as const;

export default function GamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${BASE}/api/games`)
      .then((r) => r.json())
      .then((data) => setGames(data as Game[]))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <PageTransition>
      <div className="min-h-screen bg-background">
        {/* Hero Banner */}
        <div className="relative h-48 md:h-64 overflow-hidden flex items-end">
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/60 to-background" />
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,102,0,0.15),transparent_70%)]" />
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 pb-8 w-full">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: EASE }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Gamepad2 className="h-5 w-5 text-primary" />
                <span className="text-[10px] font-black uppercase tracking-widest text-primary">
                  Game Store
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tighter">
                Games
              </h1>
            </motion.div>
          </div>
        </div>

        {/* Games Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="aspect-[3/4] rounded-2xl bg-card animate-pulse border border-border/40" />
              ))}
            </div>
          ) : games.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-20"
            >
              <Gamepad2 className="h-16 w-16 text-muted-foreground/30 mx-auto mb-4" />
              <p className="font-black uppercase tracking-wider text-muted-foreground">
                No games available yet
              </p>
            </motion.div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {games.map((game, i) => (
                <motion.div
                  key={game.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: i * 0.1, ease: EASE }}
                >
                  <Link href={`/games/${game.id}`}>
                    <motion.div
                      whileHover={{ y: -6 }}
                      transition={{ type: "spring", stiffness: 300, damping: 20 }}
                      className="group relative rounded-2xl overflow-hidden border border-border/40 hover:border-primary/40 transition-all duration-300 cursor-pointer hover:shadow-[0_20px_60px_rgba(255,102,0,0.2)]"
                    >
                      {/* Cover Image */}
                      <div className="relative aspect-[3/4] bg-card overflow-hidden">
                        {game.coverImage ? (
                          <img
                            src={game.coverImage}
                            alt={game.name}
                            className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                            <Gamepad2 className="h-20 w-20 text-muted-foreground/20" />
                          </div>
                        )}

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                        {/* Pre-order badge */}
                        {game.isPreOrder && (
                          <div className="absolute top-3 left-3">
                            <span className="bg-primary text-black text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-sm">
                              Pre-Order
                            </span>
                          </div>
                        )}

                        {/* Animated play button on hover */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
                            <ChevronRight className="h-8 w-8 text-white ml-1" />
                          </div>
                        </div>

                        {/* Bottom info */}
                        <div className="absolute bottom-0 left-0 right-0 p-4">
                          {game.platform && (
                            <p className="text-[10px] uppercase tracking-widest text-white/60 font-bold mb-1">
                              {game.platform}
                            </p>
                          )}
                          <h2 className="text-xl font-black uppercase tracking-tight text-white leading-tight">
                            {game.name}
                          </h2>

                          <div className="flex items-center justify-between mt-3">
                            {game.isPreOrder && game.preOrderDate && (
                              <div className="flex items-center gap-1.5 text-white/70">
                                <Clock className="h-3.5 w-3.5" />
                                <span className="text-xs font-bold">{game.preOrderDate}</span>
                              </div>
                            )}
                            {game.preOrderPrice != null && (
                              <div className="flex items-center gap-1.5 ml-auto">
                                <ShoppingBag className="h-3.5 w-3.5 text-primary" />
                                <span className="text-sm font-black text-primary font-mono">
                                  AED {game.preOrderPrice.toFixed(2)}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
