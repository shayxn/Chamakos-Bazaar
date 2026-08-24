import { useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Clapperboard, RotateCcw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageContent, StudioElement } from "./types";

type AnimationChoice = {
  label: string;
  preset: string;
  category: "In" | "Out" | "Loop" | "Scroll";
  phase: "in" | "out" | "loop" | "scroll";
  direction?: "up" | "down" | "left" | "right";
};

const CHOICES: AnimationChoice[] = [
  { label: "Fade", preset: "fade", category: "In", phase: "in" },
  { label: "Slide Up", preset: "slide-up", category: "In", phase: "in", direction: "up" },
  { label: "Slide Down", preset: "slide-down", category: "In", phase: "in", direction: "down" },
  { label: "Slide Left", preset: "slide-left", category: "In", phase: "in", direction: "left" },
  { label: "Slide Right", preset: "slide-right", category: "In", phase: "in", direction: "right" },
  { label: "Zoom", preset: "zoom-in", category: "In", phase: "in" },
  { label: "Pop", preset: "pop-in", category: "In", phase: "in" },
  { label: "Blur", preset: "blur-in", category: "In", phase: "in" },
  { label: "Fade Out", preset: "fade-out", category: "Out", phase: "out" },
  { label: "Out Left", preset: "slide-out-left", category: "Out", phase: "out", direction: "left" },
  { label: "Out Right", preset: "slide-out-right", category: "Out", phase: "out", direction: "right" },
  { label: "Shrink", preset: "zoom-out", category: "Out", phase: "out" },
  { label: "Float", preset: "float", category: "Loop", phase: "loop" },
  { label: "Pulse", preset: "pulse", category: "Loop", phase: "loop" },
  { label: "Wiggle", preset: "wiggle", category: "Loop", phase: "loop" },
  { label: "Glow", preset: "glow-pulse", category: "Loop", phase: "loop" },
  { label: "Reveal on scroll", preset: "slide-up", category: "Scroll", phase: "scroll", direction: "up" },
  { label: "Parallax", preset: "slide-up", category: "Scroll", phase: "scroll", direction: "up" },
];

function selectedElement(content: PageContent, selectedId: string | null) {
  if (!selectedId) return null;
  for (const section of content.sections ?? []) {
    const element = (section.elements ?? []).find((item) => item.id === selectedId);
    if (element) return element;
  }
  return null;
}

export function AnimationsPanel({
  content,
  selectedId,
  selectedType,
  onChange,
}: {
  content: PageContent;
  selectedId: string | null;
  selectedType: "section" | "element" | null;
  onChange: (content: PageContent) => void;
}) {
  const [category, setCategory] = useState<AnimationChoice["category"]>("In");
  const [active, setActive] = useState<AnimationChoice | null>(null);
  const element = useMemo(() => selectedType === "element" ? selectedElement(content, selectedId) : null, [content, selectedId, selectedType]);
  const animation = element?.animation ?? {};
  const apply = () => {
    if (!element || !active) return;
    const next = JSON.parse(JSON.stringify(content)) as PageContent;
    for (const section of next.sections) {
      const item = (section.elements ?? []).find((candidate) => candidate.id === element.id);
      if (!item) continue;
      item.animation = {
        ...item.animation,
        preset: active.preset,
        phase: active.phase,
        direction: active.direction,
        duration: Number(item.animation?.duration ?? (active.phase === "loop" ? 1.8 : 0.5)),
        delay: Number(item.animation?.delay ?? 0),
      };
      if (active.phase === "scroll") {
        item.scrollAnimation = {
          enabled: true, start: 20, end: 80,
          from: active.label === "Parallax" ? { x: 0, y: 48, scale: 1.05, rotate: 0, opacity: 0.4, blur: 0 } : { x: 0, y: 26, scale: 1, rotate: 0, opacity: 0, blur: 0 },
          to: { x: 0, y: active.label === "Parallax" ? -22 : 0, scale: 1, rotate: 0, opacity: 1, blur: 0 },
        };
      }
      onChange(next);
      return;
    }
  };
  const reset = () => {
    if (!element) return;
    const next = JSON.parse(JSON.stringify(content)) as PageContent;
    for (const section of next.sections) {
      const item = (section.elements ?? []).find((candidate) => candidate.id === element.id);
      if (!item) continue;
      item.animation = { preset: "none", duration: 0.45, delay: 0 };
      item.scrollAnimation = { enabled: false };
      onChange(next);
      return;
    }
  };

  if (!element) {
    return <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-gray-500"><Clapperboard className="mb-3 h-8 w-8 opacity-25" /><p className="text-xs font-black uppercase tracking-widest">Animations</p><p className="mt-2 text-[10px] leading-4">Select an element on the canvas, then choose an animation.</p></div>;
  }
  const choices = CHOICES.filter((choice) => choice.category === category);
  return (
    <div className="flex flex-1 flex-col bg-[#0a0a0a]">
      <div className="border-b border-white/5 bg-black p-4">
        <div className="flex items-center gap-2 text-white"><Clapperboard className="h-4 w-4 text-primary" /><h3 className="text-xs font-black uppercase tracking-wider">Animations</h3></div>
        <p className="mt-1 text-[10px] leading-4 text-gray-500">CapCut-style presets for the selected {element.type}.</p>
      </div>
      <div className="grid grid-cols-4 gap-1 border-b border-white/5 p-2">
        {(["In", "Out", "Loop", "Scroll"] as const).map((tab) => <button key={tab} onClick={() => { setCategory(tab); setActive(null); }} className={`rounded-md px-1 py-2 text-[9px] font-black uppercase tracking-wider ${category === tab ? "bg-primary/15 text-primary" : "text-gray-500 hover:bg-white/5 hover:text-white"}`}>{tab}</button>)}
      </div>
      <div className="flex-1 overflow-y-auto p-3 custom-scrollbar">
        <div className="grid grid-cols-2 gap-2">
          {choices.map((choice, index) => {
            const chosen = active?.label === choice.label || (!active && animation.preset === choice.preset && animation.phase === choice.phase);
            return <button key={choice.label} onClick={() => setActive(choice)} className={`group relative min-h-20 overflow-hidden rounded-xl border p-3 text-left transition-colors ${chosen ? "border-primary/70 bg-primary/10" : "border-white/10 bg-black hover:border-white/25"}`}>
              <motion.span animate={choice.phase === "loop" ? (choice.preset === "wiggle" ? { rotate: [0, -5, 5, 0] } : { y: [0, -4, 0] }) : { opacity: [0.4, 1], y: choice.direction === "down" ? [-6, 0] : [6, 0] }} transition={{ duration: 0.8, repeat: Infinity, repeatDelay: 0.7 }} className="mb-2 block h-4 w-8 rounded bg-primary/80" />
              <span className="block text-[10px] font-black uppercase tracking-wide text-white">{choice.label}</span>
              <span className="mt-1 block text-[9px] text-gray-500">{choice.category}</span>
              {index === 0 && <Sparkles className="absolute right-2 top-2 h-3 w-3 text-primary/70" />}
            </button>;
          })}
        </div>
        <div className="mt-5 space-y-3 rounded-xl border border-white/8 bg-black p-3">
          <div className="grid grid-cols-2 gap-2">
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Speed <input type="number" min="0.1" step="0.1" value={animation.duration ?? 0.45} onChange={(event) => { const next = JSON.parse(JSON.stringify(content)) as PageContent; for (const section of next.sections) { const item = (section.elements ?? []).find((candidate) => candidate.id === element.id); if (item) { item.animation = { ...item.animation, duration: Number(event.target.value) }; onChange(next); break; } } }} className="mt-1 w-full rounded border border-white/10 bg-[#080808] px-2 py-1.5 text-xs text-white outline-none" /></label>
            <label className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Delay <input type="number" min="0" step="0.1" value={animation.delay ?? 0} onChange={(event) => { const next = JSON.parse(JSON.stringify(content)) as PageContent; for (const section of next.sections) { const item = (section.elements ?? []).find((candidate) => candidate.id === element.id); if (item) { item.animation = { ...item.animation, delay: Number(event.target.value) }; onChange(next); break; } } }} className="mt-1 w-full rounded border border-white/10 bg-[#080808] px-2 py-1.5 text-xs text-white outline-none" /></label>
          </div>
          <label className="block text-[9px] font-bold uppercase tracking-wider text-gray-500">Strength <input type="range" min="1" max="100" value={animation.strength ?? 50} onChange={(event) => { const next = JSON.parse(JSON.stringify(content)) as PageContent; for (const section of next.sections) { const item = (section.elements ?? []).find((candidate) => candidate.id === element.id); if (item) { item.animation = { ...item.animation, strength: Number(event.target.value) }; onChange(next); break; } } }} className="mt-2 w-full accent-orange-500" /></label>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-white/5 bg-black p-3">
        <Button variant="ghost" size="sm" onClick={reset} className="text-[10px] font-black uppercase tracking-wider text-gray-400"><RotateCcw className="mr-1 h-3.5 w-3.5" />Reset</Button>
        <Button size="sm" onClick={apply} disabled={!active} className="bg-primary text-[10px] font-black uppercase tracking-wider text-black hover:bg-primary/90">Apply animation</Button>
      </div>
    </div>
  );
}