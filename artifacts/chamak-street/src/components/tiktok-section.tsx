import { motion, useScroll, useTransform, useInView } from "framer-motion";
import { useListTiktokVideos } from "@workspace/api-client-react";
import { useSettings } from "@/lib/use-settings";
import { useRef, useState, useEffect } from "react";

function ScrollVideo({ video, index }: { video: { id: number | string; embedUrl: string; thumbnailUrl?: string | null; title?: string | null }; index: number }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [faded, setFaded] = useState(false);
  const [playing, setPlaying] = useState(false);

  const isInView = useInView(containerRef, { margin: "-20% 0px -20% 0px", once: false });

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start end", "end start"],
  });

  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.78, 1, 1, 0.78]);
  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.6, 0.85, 1], [0, 1, 1, faded ? 0 : 1, 0]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [60, 0, 0, -60]);

  useEffect(() => {
    if (!videoRef.current) return;
    if (isInView) {
      setFaded(false);
      videoRef.current.play().catch(() => {});
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  }, [isInView]);

  const handleVideoEnd = () => {
    setFaded(true);
    setPlaying(false);
  };

  // Determine if the embedUrl is a direct video file or an iframe URL
  const isDirectVideo = video.embedUrl && (
    video.embedUrl.endsWith(".mp4") ||
    video.embedUrl.endsWith(".webm") ||
    video.embedUrl.endsWith(".mov")
  );

  return (
    <motion.div
      ref={containerRef}
      style={{ scale, opacity, y }}
      className="relative mx-auto"
      initial={false}
    >
      <div
        className="relative overflow-hidden"
        style={{
          width: "min(340px, 85vw)",
          aspectRatio: "9/16",
          borderRadius: "24px",
          background: "#0a0a0a",
          boxShadow: isInView && !faded
            ? "0 32px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.08), 0 0 60px rgba(255,102,0,0.08)"
            : "0 16px 40px rgba(0,0,0,0.5)",
          transition: "box-shadow 0.6s ease",
        }}
      >
        {isDirectVideo ? (
          <video
            ref={videoRef}
            src={video.embedUrl}
            muted
            playsInline
            loop={false}
            onEnded={handleVideoEnd}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              display: "block",
            }}
          />
        ) : (
          /* For TikTok embed URLs — show thumbnail with auto-play overlay effect */
          <>
            {video.thumbnailUrl ? (
              <img
                src={video.thumbnailUrl}
                alt={video.title ?? ""}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              <div style={{
                width: "100%",
                height: "100%",
                background: "linear-gradient(180deg, #111 0%, #000 100%)",
              }} />
            )}
            {/* Scan-line shimmer overlay when "playing" */}
            {isInView && !faded && (
              <motion.div
                style={{
                  position: "absolute",
                  inset: 0,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 50%, rgba(0,0,0,0.1) 100%)",
                  mixBlendMode: "overlay",
                }}
                animate={{ opacity: [0.4, 0.8, 0.4] }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              />
            )}
          </>
        )}

        {/* Bottom gradient */}
        <div style={{
          position: "absolute",
          bottom: 0, left: 0, right: 0,
          height: "40%",
          background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)",
          pointerEvents: "none",
        }} />

        {/* Title */}
        {video.title && (
          <motion.p
            style={{
              position: "absolute",
              bottom: 20, left: 18, right: 18,
              fontSize: "13px",
              fontWeight: 700,
              color: "rgba(255,255,255,0.85)",
              lineHeight: 1.4,
              textShadow: "0 1px 8px rgba(0,0,0,0.8)",
            }}
            animate={{ opacity: isInView && !faded ? 1 : 0 }}
            transition={{ duration: 0.4 }}
          >
            {video.title}
          </motion.p>
        )}

        {/* Specular top edge */}
        <div style={{
          position: "absolute",
          top: 0, left: 0, right: 0,
          height: "1px",
          background: "rgba(255,255,255,0.12)",
          pointerEvents: "none",
        }} />
      </div>
    </motion.div>
  );
}

export function TiktokSection() {
  const settings = useSettings();
  const { data: videos } = useListTiktokVideos({ query: { staleTime: 60_000, queryKey: ["tiktok", "public"] } });

  const title = settings.tiktok_section_title || "As Seen On";
  const visible = settings.tiktok_section_visible !== "false";

  if (!visible || !videos || videos.length === 0) return null;

  return (
    <section className="py-32 overflow-hidden">
      <div className="container mx-auto px-4">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.4 }}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          className="text-center mb-20"
        >
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary/70 mb-3">
            @firstpick
          </p>
          <h2 className="text-4xl md:text-6xl font-black uppercase tracking-tighter">{title}</h2>
        </motion.div>

        {/* Videos — vertical scroll experience */}
        <div
          className="flex flex-col items-center gap-32"
          style={{ paddingTop: "2vh", paddingBottom: "8vh" }}
        >
          {videos.slice(0, 6).map((video, i) => (
            <ScrollVideo key={video.id} video={video} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
