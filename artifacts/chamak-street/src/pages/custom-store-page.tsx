import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useRoute } from "wouter";
import { motion } from "framer-motion";
import { ArrowRight, PackageOpen } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type StudioElement = {
  id?: string;
  type?: string;
  text?: string;
  url?: string;
  href?: string;
  imageUrl?: string;
  label?: string;
  productId?: string | number;
  animation?: { preset?: string; duration?: number; delay?: number; strength?: number };
  scrollAnimation?: {
    enabled?: boolean; start?: number; end?: number;
    from?: Record<string, number>; to?: Record<string, number>;
  };
};

type StudioSection = {
  id: string;
  type: string;
  label?: string;
  hidden?: boolean;
  elements?: StudioElement[];
};

type PublishedPage = {
  title: string;
  slug: string;
  content: {
    sections: StudioSection[];
    events?: Array<{ id: string; trigger: string; targetId?: string; enabled?: boolean; actions: Array<{ type: string; message?: string; href?: string; productId?: number; soundUrl?: string; targetId?: string }> }>;
  };
};

function elementMotion(element: StudioElement) {
  const preset = element.animation?.preset ?? "fade";
  const delay = Number(element.animation?.delay ?? 0);
  const duration = Math.max(0.18, Number(element.animation?.duration ?? 0.45));
  const strength = Number(element.animation?.strength ?? 22);
  const initial = preset === "slide-left" ? { opacity: 0, x: -strength } :
    preset === "slide-right" ? { opacity: 0, x: strength } :
    preset === "slide-down" ? { opacity: 0, y: -strength } :
    preset === "slide-up" ? { opacity: 0, y: strength } :
    preset.includes("zoom") || preset === "pop-in" ? { opacity: 0, scale: 0.88 } :
    preset === "blur-in" ? { opacity: 0, filter: "blur(10px)" } :
    preset === "rotate-in" ? { opacity: 0, rotate: -8, scale: 0.95 } :
    preset === "flip-in" ? { opacity: 0, rotateX: 58 } : { opacity: 0 };
  const loop = preset === "float" ? { y: [0, -8, 0] } :
    preset === "pulse" ? { scale: [1, 1.035, 1] } :
    preset === "wiggle" ? { rotate: [0, -1.5, 1.5, 0] } :
    preset === "glow-pulse" ? { filter: ["drop-shadow(0 0 0 rgba(255,106,0,0))", "drop-shadow(0 0 12px rgba(255,106,0,.65))", "drop-shadow(0 0 0 rgba(255,106,0,0))"] } : null;
  if (loop) return { initial: false, animate: loop, transition: { duration: Math.max(1.2, duration * 3), repeat: Infinity, ease: "easeInOut" as const } };
  return { initial, whileInView: { opacity: 1, x: 0, y: 0, scale: 1, rotate: 0, rotateX: 0, filter: "blur(0px)" }, viewport: { once: true, amount: 0.15 }, transition: { delay, duration, ease: [0.16, 1, 0.3, 1] as const } };
}

function ScrollFrame({ element, children }: { element: StudioElement; children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  useEffect(() => {
    if (!element.scrollAnimation?.enabled) { setStyle({}); return; }
    const update = () => {
      const node = ref.current;
      if (!node) return;
      const rect = node.getBoundingClientRect();
      const range = Math.max(1, window.innerHeight + rect.height);
      const position = ((window.innerHeight - rect.top) / range) * 100;
      const start = Number(element.scrollAnimation?.start ?? 20);
      const end = Math.max(start + 1, Number(element.scrollAnimation?.end ?? 80));
      const progress = Math.max(0, Math.min(1, (position - start) / (end - start)));
      const from = element.scrollAnimation?.from ?? {};
      const to = element.scrollAnimation?.to ?? {};
      const number = (key: string, fallback: number) => Number(from[key] ?? fallback) + (Number(to[key] ?? fallback) - Number(from[key] ?? fallback)) * progress;
      setStyle({
        transform: `translate3d(${number("x", 0)}px, ${number("y", 0)}px, 0) scale(${number("scale", 1)}) rotate(${number("rotate", 0)}deg)`,
        opacity: number("opacity", 1),
        filter: `blur(${number("blur", 0)}px)`,
        willChange: "transform, opacity, filter",
      });
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => { window.removeEventListener("scroll", update); window.removeEventListener("resize", update); };
  }, [element.scrollAnimation]);
  return <div ref={ref} style={style}>{children}</div>;
}

function ProductBinding({ id, onClick }: { id?: string | number; onClick: () => void }) {
  const [product, setProduct] = useState<any>(null);
  useEffect(() => {
    if (!id) { setProduct(null); return; }
    const controller = new AbortController();
    fetch(`${BASE}/api/products/${encodeURIComponent(String(id))}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then(setProduct)
      .catch(() => setProduct(null));
    return () => controller.abort();
  }, [id]);
  if (!id) return <div className="rounded-2xl border border-dashed border-white/15 p-5 text-xs text-white/45">Choose a real product ID in Owner Studio.</div>;
  if (!product) return <div className="rounded-2xl border border-white/10 p-5 text-xs text-white/45">Product unavailable.</div>;
  const image = product.imageUrl || product.image || product.images?.[0];
  return (
    <Link href={`/product/${product.id}`} onClick={onClick} className="group flex max-w-md overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition hover:border-orange-400/60">
      {image && <img src={image} alt={product.name} className="h-28 w-28 shrink-0 object-cover transition-transform group-hover:scale-105" />}
      <span className="flex min-w-0 flex-1 flex-col justify-center p-4"><b className="truncate text-sm text-white">{product.name}</b><span className="mt-1 text-xs font-black text-orange-300">AED {product.price}</span><span className="mt-3 text-[9px] font-black uppercase tracking-widest text-white/45">View product</span></span>
    </Link>
  );
}

function StudioElementView({ element, onEvent }: { element: StudioElement; onEvent: (trigger: string, id?: string) => boolean }) {
  const type = element.type ?? "text";
  const motionProps = elementMotion(element);
  const wrap = (child: React.ReactNode) => <ScrollFrame element={element}>{child}</ScrollFrame>;
  if (type === "product") return wrap(<motion.div {...motionProps}><ProductBinding id={element.productId} onClick={() => onEvent("product-click", element.id)} /></motion.div>);
  if (type === "image" || type === "video") {
    const source = element.url || element.imageUrl;
    if (!source) return null;
      return wrap(
      <motion.figure {...motionProps} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {type === "video" ? (
          <video src={source} controls className="block w-full max-h-[70vh] object-cover" />
        ) : (
          <img src={source} alt={element.label || ""} className="block w-full max-h-[70vh] object-cover" loading="lazy" />
        )}
      </motion.figure>
    );
  }
  if (type === "button" || type === "link") {
    const href = element.href || element.url || "/shop";
      return wrap(
      <motion.div {...motionProps}>
          <Link href={href} onClick={(event) => { if (onEvent("button-click", element.id)) event.preventDefault(); }} className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition-transform hover:scale-[1.02]" style={{ background: "linear-gradient(100deg, #ff6a00, #ffca28)" }}>{element.text || element.label || "Explore"} <ArrowRight className="h-3.5 w-3.5" /></Link>
      </motion.div>
    );
  }
  if (type === "heading") {
    return wrap(<motion.h2 {...motionProps} className="text-3xl sm:text-5xl font-black tracking-[-0.05em] uppercase leading-[0.9]">{element.text || element.label}</motion.h2>);
  }
  if (type === "badge") {
    return wrap(<motion.span {...motionProps} className="inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-200">{element.text || element.label}</motion.span>);
  }
  if (type === "divider") return wrap(<motion.hr {...motionProps} className="max-w-2xl border-white/15" />);
  return wrap(<motion.p {...motionProps} className="max-w-2xl text-base leading-7 text-white/65">{element.text || element.label}</motion.p>);
}

export default function CustomStorePage() {
  const [, params] = useRoute("/:slug");
  const [, navigate] = useLocation();
  const slug = params?.slug ?? "";
  const [page, setPage] = useState<PublishedPage | null>(null);
  const [state, setState] = useState<"loading" | "missing" | "ready">("loading");
  const [notice, setNotice] = useState("");
  const runActions = useCallback((actions: PublishedPage["content"]["events"][number]["actions"]) => {
    actions.forEach((action) => {
      if (action.type === "show-notification" && action.message) setNotice(action.message);
      if (action.type === "navigate" && action.href) /^https:\/\//i.test(action.href) ? window.location.assign(action.href) : navigate(action.href);
      if (action.type === "open-product" && action.productId) navigate(`/product/${action.productId}`);
      if (action.type === "play-sound" && action.soundUrl) new Audio(action.soundUrl).play().catch(() => undefined);
      if (action.type === "trigger-animation" && action.targetId) document.getElementById(action.targetId)?.classList.add("animate-pulse");
    });
  }, [navigate]);
  const runEvent = useCallback((trigger: string, targetId?: string) => {
    const matching = page?.content.events?.filter((event) => event.enabled !== false && event.trigger === trigger && (!event.targetId || event.targetId === targetId)) ?? [];
    matching.forEach((event) => runActions(event.actions));
    return matching.length > 0;
  }, [page, runActions]);

  useEffect(() => {
    const controller = new AbortController();
    setState("loading");
    fetch(`${BASE}/api/owner-studio/public/${encodeURIComponent(slug)}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error("missing");
        return response.json() as Promise<PublishedPage>;
      })
      .then((result) => { setPage(result); setState("ready"); })
      .catch((error) => {
        if ((error as Error).name !== "AbortError") setState("missing");
      });
    return () => controller.abort();
  }, [slug]);

  useEffect(() => {
    if (page) runEvent("page-open");
  }, [page, runEvent]);

  if (state === "loading") {
    return <div className="min-h-[55vh] flex items-center justify-center"><div className="h-8 w-8 rounded-full border-2 border-orange-500 border-t-transparent animate-spin" /></div>;
  }
  if (state === "missing" || !page) {
    return (
      <div className="min-h-[58vh] flex flex-col items-center justify-center px-5 text-center">
        <PackageOpen className="h-9 w-9 text-orange-400 mb-4" />
        <p className="text-xs font-black uppercase tracking-[0.28em] text-white/60">Page unavailable</p>
        <Link href="/shop" className="mt-4 text-sm font-bold text-orange-300 hover:text-orange-200">Return to shop</Link>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <title>{`${page.title} | FirstPick`}</title>
      {notice && <button type="button" onClick={() => setNotice("")} className="fixed left-1/2 top-5 z-50 -translate-x-1/2 rounded-full border border-orange-400/30 bg-black/90 px-5 py-3 text-xs font-bold text-orange-100 shadow-2xl backdrop-blur">{notice} <span className="ml-2 text-orange-300">Dismiss</span></button>}
      {page.content.sections.filter((section) => !section.hidden).map((section, index) => (
        <section key={section.id || `${section.type}-${index}`} className={`relative overflow-hidden px-5 py-16 sm:px-8 sm:py-24 ${section.type === "hero" || section.type === "full-screen" ? "min-h-[72vh] flex items-center" : ""}`}>
          <div className="absolute inset-0 pointer-events-none" style={{ background: index % 2 ? "radial-gradient(circle at 80% 20%, rgba(255,102,0,0.12), transparent 36%)" : "radial-gradient(circle at 15% 25%, rgba(255,190,40,0.10), transparent 34%)" }} />
          <div className={`relative mx-auto w-full ${section.type === "full-screen" ? "max-w-6xl" : "max-w-5xl"} space-y-5`}>
            {section.label && <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300/80">{section.label}</p>}
            {(section.elements ?? []).map((element, elementIndex) => <StudioElementView key={element.id || `${element.type}-${elementIndex}`} element={element} onEvent={runEvent} />)}
          </div>
        </section>
      ))}
    </main>
  );
}