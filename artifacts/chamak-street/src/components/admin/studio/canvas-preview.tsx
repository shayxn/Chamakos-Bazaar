import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { PageContent, StudioSection, StudioElement } from "./types";

function elementMotion(element: StudioElement) {
  const preset = element.animation?.preset ?? "fade";
  const delay = Number(element.animation?.delay ?? 0);
  const duration = Math.max(0.18, Number(element.animation?.duration ?? 0.45));
  const initial = preset.includes("slide") ? { opacity: 0, y: 22 } : preset.includes("zoom") ? { opacity: 0, scale: 0.92 } : { opacity: 0 };
  return { initial, whileInView: { opacity: 1, y: 0, scale: 1 }, viewport: { once: true, amount: 0.15 }, transition: { delay, duration, ease: [0.16, 1, 0.3, 1] as const } };
}

function StudioElementPreview({ element }: { element: StudioElement }) {
  const type = element.type ?? "text";
  const motionProps = elementMotion(element);
  
  if (type === "image" || type === "video") {
    const source = element.url || element.imageUrl;
    if (!source) return <div className="h-32 w-full border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-[10px] uppercase text-gray-500 rounded-xl">Missing Media URL</div>;
    return (
      <motion.figure {...motionProps} className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03]">
        {type === "video" ? (
          <video src={source} controls className="block w-full max-h-[70vh] object-cover pointer-events-none" />
        ) : (
          <img src={source} alt={element.label || ""} className="block w-full max-h-[70vh] object-cover pointer-events-none" loading="lazy" />
        )}
      </motion.figure>
    );
  }
  
  if (type === "button" || type === "link") {
    return (
      <motion.div {...motionProps} className="pointer-events-none">
        <div className="inline-flex items-center gap-2 rounded-full px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-black transition-transform" style={{ background: "linear-gradient(100deg, #ff6a00, #ffca28)" }}>
          {element.text || element.label || "Explore"} <ArrowRight className="h-3.5 w-3.5" />
        </div>
      </motion.div>
    );
  }
  
  if (type === "heading") {
    return <motion.h2 {...motionProps} className="text-3xl sm:text-5xl font-black tracking-[-0.05em] uppercase leading-[0.9] text-white">{element.text || element.label || "Heading"}</motion.h2>;
  }
  
  if (type === "badge") {
    return <motion.span {...motionProps} className="inline-flex rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.22em] text-orange-200">{element.text || element.label || "Badge"}</motion.span>;
  }
  
  if (type === "product") {
    return (
      <motion.div {...motionProps} className="p-4 border border-dashed border-orange-500/30 bg-orange-500/5 rounded-xl text-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-orange-400">Product Spotlight</p>
        <p className="text-xs text-orange-200/50 mt-1">{element.productId ? `Bound to: ${element.productId}` : "No product selected"}</p>
      </motion.div>
    );
  }
  
  return <motion.p {...motionProps} className="max-w-2xl text-base leading-7 text-white/65">{element.text || element.label || "Enter text..."}</motion.p>;
}

export function CanvasPreview({ 
  content, 
  selectedId, 
  onSelect,
  onDropItem,
}: { 
  content: PageContent;
  selectedId: string | null;
  onSelect: (id: string, type: "section" | "element") => void;
  onDropItem: (payload: Record<string, unknown>, sectionId?: string) => void;
}) {
  const readDrop = (event: React.DragEvent, sectionId?: string) => {
    event.preventDefault();
    event.stopPropagation();
    try {
      const raw = event.dataTransfer.getData("application/x-firstpick-studio");
      const payload = JSON.parse(raw) as Record<string, unknown>;
      if (payload && typeof payload === "object") onDropItem(payload, sectionId);
    } catch {
      // Ignore unrelated browser drag payloads.
    }
  };

  if (!content.sections || content.sections.length === 0) {
    return (
      <div className="h-full flex items-center justify-center" onDragOver={(event) => event.preventDefault()} onDrop={(event) => readDrop(event)}>
        <div className="text-center">
          <p className="text-xs font-black uppercase tracking-widest text-gray-500">Empty Canvas</p>
          <p className="text-[10px] text-gray-600 mt-2">Add sections from the toolbox to start building.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-black">
      {content.sections.map((section, index) => {
        const isSelected = selectedId === section.id;
        
        return (
          <div 
            key={section.id}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(section.id, "section");
            }}
            className={`relative group transition-colors cursor-pointer ${
              isSelected ? "ring-2 ring-inset ring-primary z-10" : "hover:ring-1 hover:ring-inset hover:ring-white/20"
            }`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => readDrop(event, section.id)}
          >
            {/* Section overlay marker */}
            <div className={`absolute top-0 left-0 px-2 py-1 text-[9px] font-black uppercase tracking-widest bg-black text-white ${isSelected ? "bg-primary text-black" : "opacity-0 group-hover:opacity-100"}`}>
              Section: {section.type} {section.hidden && "(Hidden)"}
            </div>

            <section className={`relative overflow-hidden px-5 py-16 sm:px-8 sm:py-24 ${section.type === "hero" || section.type === "full-screen" ? "min-h-[72vh] flex items-center" : ""} ${section.hidden ? "opacity-30" : ""}`}>
              <div className="absolute inset-0 pointer-events-none" style={{ background: index % 2 ? "radial-gradient(circle at 80% 20%, rgba(255,102,0,0.12), transparent 36%)" : "radial-gradient(circle at 15% 25%, rgba(255,190,40,0.10), transparent 34%)" }} />
              
              <div className={`relative mx-auto w-full ${section.type === "full-screen" ? "max-w-6xl" : "max-w-5xl"} space-y-5 pointer-events-none`}>
                {section.label && <p className="text-[10px] font-black uppercase tracking-[0.28em] text-orange-300/80">{section.label}</p>}
                
                {(section.elements || []).map((element) => {
                  const isElSelected = selectedId === element.id;
                  return (
                    <div 
                      key={element.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(element.id, "element");
                      }}
                      className={`relative group/el pointer-events-auto cursor-pointer p-2 -m-2 rounded-lg transition-colors ${
                        isElSelected ? "ring-1 ring-primary bg-primary/5" : "hover:bg-white/5"
                      }`}
                    >
                      <StudioElementPreview element={element} />
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        );
      })}
    </div>
  );
}
