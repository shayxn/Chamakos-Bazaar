import { motion } from "framer-motion";
import { useListReviews } from "@workspace/api-client-react";
import { useSettings } from "@/lib/use-settings";
import { ChevronLeft, ChevronRight, Star, BadgeCheck } from "lucide-react";
import { useRef, useState } from "react";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-3.5 w-3.5 ${s <= rating ? "text-primary fill-primary" : "text-muted-foreground/30"}`}
        />
      ))}
    </div>
  );
}

export function ReviewsSection() {
  const settings = useSettings();
  const { data: reviews } = useListReviews({ query: { staleTime: 60_000, queryKey: ["reviews", "public"] } });
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  const title = settings.reviews_section_title || "What They Say";
  const visible = settings.reviews_section_visible !== "false";

  if (!visible || !reviews || reviews.length === 0) return null;

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft + clientWidth < scrollWidth - 10);
  };

  const scroll = (dir: "left" | "right") => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollBy({ left: dir === "right" ? 340 : -340, behavior: "smooth" });
  };

  return (
    <section className="py-24 overflow-hidden bg-card/30">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.5 }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <p className="text-xs text-primary uppercase tracking-[0.3em] font-black mb-3">Customer Reviews</p>
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
          {reviews.map((review, i) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ delay: i * 0.07, duration: 0.4 }}
              style={{ scrollSnapAlign: "start", minWidth: "300px", maxWidth: "320px", flexShrink: 0 }}
            >
              <motion.div
                whileHover={{ y: -6 }}
                transition={{ type: "spring", stiffness: 300, damping: 22 }}
                className="group h-full rounded-2xl border border-white/10 bg-card/60 backdrop-blur-sm p-6 relative overflow-hidden"
                style={{ boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}
              >
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center text-sm font-black text-primary shrink-0 overflow-hidden">
                    {review.customerAvatar ? (
                      <img src={review.customerAvatar} alt={review.customerName} className="w-full h-full object-cover" />
                    ) : (
                      review.customerName[0].toUpperCase()
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-black text-sm truncate">{review.customerName}</span>
                      {review.isVerified && (
                        <BadgeCheck className="h-4 w-4 text-primary shrink-0" />
                      )}
                    </div>
                    <StarRating rating={review.rating} />
                  </div>
                </div>

                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{review.body}</p>

                {review.imageUrls && (() => {
                  try {
                    const imgs = JSON.parse(review.imageUrls) as string[];
                    if (imgs.length > 0) {
                      return (
                        <div className="mt-4 flex gap-2">
                          {imgs.slice(0, 3).map((url, j) => (
                            <div key={j} className="w-16 h-16 rounded-lg overflow-hidden border border-border/40 shrink-0">
                              <img src={url} alt="Review" className="w-full h-full object-cover" />
                            </div>
                          ))}
                        </div>
                      );
                    }
                  } catch { return null; }
                  return null;
                })()}
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
