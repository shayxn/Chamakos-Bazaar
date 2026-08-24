import { useEffect, useState } from "react";
import { Link } from "wouter";
import { motion } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Element = {
  id: string;
  type: string;
  text?: string;
  label?: string;
  href?: string;
  url?: string;
  imageUrl?: string;
  productId?: string | number;
  animation?: { preset?: string; duration?: number; delay?: number };
};
type Content = { sections?: Array<{ id: string; type: string; label?: string; hidden?: boolean; elements?: Element[] }> };

function motionProps(element: Element) {
  const preset = element.animation?.preset ?? "fade";
  const duration = Math.max(0.18, Number(element.animation?.duration ?? 0.45));
  const delay = Number(element.animation?.delay ?? 0);
  const initial = preset === "slide-left" ? { opacity: 0, x: -24 } :
    preset === "slide-right" ? { opacity: 0, x: 24 } :
    preset === "slide-down" ? { opacity: 0, y: -24 } :
    preset.includes("slide") ? { opacity: 0, y: 24 } :
    preset.includes("zoom") || preset === "pop-in" ? { opacity: 0, scale: 0.9 } :
    preset === "blur-in" ? { opacity: 0, filter: "blur(10px)" } : { opacity: 0 };
  const loop = preset === "float" ? { y: [0, -7, 0] } :
    preset === "pulse" ? { scale: [1, 1.03, 1] } :
    preset === "wiggle" ? { rotate: [0, -1.5, 1.5, 0] } : null;
  return loop
    ? { initial: false, animate: loop, transition: { duration: Math.max(1.2, duration * 3), repeat: Infinity, ease: "easeInOut" as const } }
    : { initial, whileInView: { opacity: 1, x: 0, y: 0, scale: 1, filter: "blur(0px)" }, viewport: { once: true, amount: 0.15 }, transition: { duration, delay, ease: [0.16, 1, 0.3, 1] as const } };
}

function LayerElement({ element }: { element: Element }) {
  const props = motionProps(element);
  if (element.type === "image" && (element.imageUrl || element.url)) {
    return <motion.img {...props} src={element.imageUrl || element.url} alt={element.label || ""} className="max-h-[70vh] w-full rounded-2xl border border-white/10 object-cover" loading="lazy" />;
  }
  if (element.type === "video" && element.url) {
    return <motion.video {...props} src={element.url} controls className="max-h-[70vh] w-full rounded-2xl border border-white/10 object-cover" />;
  }
  if (element.type === "heading") return <motion.h2 {...props} className="text-3xl font-black uppercase leading-[0.9] tracking-[-0.05em] sm:text-5xl">{element.text || element.label}</motion.h2>;
  if (element.type === "badge") return <motion.span {...props} className="inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-orange-200">{element.text || element.label}</motion.span>;
  if (element.type === "button" || element.type === "link") {
    return <motion.div {...props}><Link href={element.href || element.url || "/shop"} className="inline-flex rounded-full bg-primary px-5 py-3 text-xs font-black uppercase tracking-[0.16em] text-black transition-transform hover:scale-[1.02]">{element.text || element.label || "Explore"}</Link></motion.div>;
  }
  if (element.type === "divider") return <motion.hr {...props} className="max-w-2xl border-white/15" />;
  if (element.type === "product") return <motion.div {...props} className="rounded-2xl border border-dashed border-primary/35 bg-primary/5 p-5 text-sm text-white/55">Product block {element.productId ? `bound to #${element.productId}` : "needs a product ID"}</motion.div>;
  return <motion.p {...props} className="max-w-2xl text-base leading-7 text-white/65">{element.text || element.label}</motion.p>;
}

function routeTemplate(route: string) {
  if (/^\/product\/[^/]+$/.test(route)) return "/product/:id";
  if (/^\/order\/[^/]+$/.test(route)) return "/order/:id";
  if (/^\/receipt\/[^/]+$/.test(route)) return "/receipt/:id";
  if (/^\/games\/[^/]+$/.test(route)) return "/games/:id";
  return route;
}

export function SystemStudioLayer({ route, admin = false }: { route: string; admin?: boolean }) {
  const [content, setContent] = useState<Content | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setContent(null);
    const endpoint = admin ? "admin-system-page" : "system-page";
    fetch(`${BASE}/api/owner-studio/${endpoint}?route=${encodeURIComponent(routeTemplate(route))}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then((result) => { if (!controller.signal.aborted) setContent(result?.content ?? null); })
      .catch(() => undefined);
    return () => controller.abort();
  }, [route]);

  const sections = content?.sections?.filter((section) => !section.hidden) ?? [];
  if (!sections.length) return null;
  return (
    <div data-firstpick-studio-layer="true">
      {sections.map((section, index) => (
        <section key={section.id} className={`relative overflow-hidden px-5 py-14 sm:px-8 sm:py-20 ${section.type === "hero" || section.type === "full-screen" ? "min-h-[55vh] flex items-center" : ""}`}>
          <div className="pointer-events-none absolute inset-0" style={{ background: index % 2 ? "radial-gradient(circle at 80% 20%, rgba(255,102,0,0.12), transparent 36%)" : "radial-gradient(circle at 15% 25%, rgba(255,190,40,0.10), transparent 34%)" }} />
          <div className="relative mx-auto w-full max-w-5xl space-y-5">
            {section.label && <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300/80">{section.label}</p>}
            {(section.elements ?? []).map((element) => <LayerElement key={element.id} element={element} />)}
          </div>
        </section>
      ))}
    </div>
  );
}