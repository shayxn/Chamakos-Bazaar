import { motion } from "framer-motion";
import { useListTiktokVideos } from "@workspace/api-client-react";
import { useSettings } from "@/lib/use-settings";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { useRef, useState } from "react";

export function TiktokSection() {
  const settings = useSettings();
  const { data: videos } = useListTiktokVideos({ query: { staleTime: 60_000, queryKey: ["tiktok", "public"] } });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const title = settings.tiktok_section_title || "Follow Us on TikTok";
  const visible = settings.tiktok_section_visible !== "false";

  if (!visible || !videos || videos.length === 0) return null;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 300 : -300, behavior: "smooth" });
  };

  return (
    <section className="py-24 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-3">@chamakstreet</p>
            <h2 className="text-3xl md:text-5xl font-black uppercase tracking-tighter">{title}</h2>
          </div>
          <div className="flex gap-2">
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => scroll("left")}
              disabled={!canScrollLeft}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-30"
            >
              <ChevronLeft className="h-4 w-4" />
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}
              onClick={() => scroll("right")}
              disabled={!canScrollRight}
              className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:border-primary hover:text-primary transition-colors disabled:opacity-30"
            >
              <ChevronRight className="h-4 w-4" />
            </motion.button>
          </div>
        </motion.div>

        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-5 overflow-x-auto scrollbar-hide pb-4"
          style={{ scrollSnapType: "x mandatory" }}
        >
          {videos.map((video, i) => (
            <motion.div
              key={video.id}
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.06, duration: 0.4 }}
              style={{ scrollSnapAlign: "start", minWidth: "240px", flexShrink: 0 }}
            >
              <motion.div
                whileHover={{ y: -6, scale: 1.02 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group relative rounded-2xl overflow-hidden border border-white/10 bg-card cursor-pointer"
                style={{ aspectRatio: "9/16" }}
                onClick={() => window.open(video.embedUrl, "_blank")}
              >
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title ?? "TikTok"} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-b from-zinc-900 to-black flex items-center justify-center">
                    <Play className="h-10 w-10 text-white/50" />
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent" />
                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-white flex items-center justify-center shrink-0">
                      <Play className="h-3 w-3 text-black fill-black" />
                    </div>
                    {video.title && (
                      <p className="text-white text-xs font-bold line-clamp-2">{video.title}</p>
                    )}
                  </div>
                </div>
                <div className="absolute inset-0 border-2 border-transparent group-hover:border-primary/30 rounded-2xl transition-colors duration-300" />
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
