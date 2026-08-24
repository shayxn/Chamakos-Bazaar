import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Settings2, ArrowDown, ArrowUp, Copy, Save } from "lucide-react";
import { StudioSection, StudioElement } from "./types";
import { fetchApi } from "./api";

export function PropertiesPanel({
  selectedId,
  selectedType,
  content,
  onChange,
  onClose,
  isOwner,
}: {
  selectedId: string | null;
  selectedType: "section" | "element" | null;
  content: any;
  onChange: (newContent: any) => void;
  onClose: () => void;
  isOwner: boolean;
}) {
  if (!selectedId || !selectedType) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-gray-500">
        <Settings2 className="h-8 w-8 opacity-20 mb-3" />
        <p className="text-xs font-black uppercase tracking-widest">Properties</p>
        <p className="text-[10px] mt-2">Select a section or element on the canvas to edit.</p>
      </div>
    );
  }

  // Find the selected item
  let itemToEdit: any = null;
  let parentSectionIndex = -1;
  let elementIndex = -1;

  if (selectedType === "section") {
    parentSectionIndex = content.sections.findIndex((s: StudioSection) => s.id === selectedId);
    itemToEdit = content.sections[parentSectionIndex];
  } else {
    for (let i = 0; i < content.sections.length; i++) {
      const idx = (content.sections[i].elements || []).findIndex((e: StudioElement) => e.id === selectedId);
      if (idx !== -1) {
        parentSectionIndex = i;
        elementIndex = idx;
        itemToEdit = content.sections[i].elements[idx];
        break;
      }
    }
  }

  if (!itemToEdit) return null;

  const updateItem = (updates: any) => {
    const newContent = { ...content };
    if (selectedType === "section") {
      newContent.sections[parentSectionIndex] = { ...itemToEdit, ...updates };
    } else {
      newContent.sections[parentSectionIndex].elements[elementIndex] = { ...itemToEdit, ...updates };
    }
    onChange(newContent);
  };

  const deleteItem = () => {
    if (!window.confirm(`Delete this ${selectedType}? This can be restored from the page history after it is saved.`)) return;
    const newContent = JSON.parse(JSON.stringify(content));
    if (selectedType === "section") {
      newContent.sections.splice(parentSectionIndex, 1);
    } else {
      newContent.sections[parentSectionIndex].elements.splice(elementIndex, 1);
    }
    onChange(newContent);
    onClose();
  };

  const moveSection = (direction: -1 | 1) => {
    if (selectedType !== "section") return;
    const targetIndex = parentSectionIndex + direction;
    if (targetIndex < 0 || targetIndex >= content.sections.length) return;
    const next = { ...content, sections: [...content.sections] };
    [next.sections[parentSectionIndex], next.sections[targetIndex]] = [next.sections[targetIndex], next.sections[parentSectionIndex]];
    onChange(next);
  };

  const duplicateSection = () => {
    if (selectedType !== "section") return;
    const copy = JSON.parse(JSON.stringify(itemToEdit)) as StudioSection;
    copy.id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    copy.elements = (copy.elements ?? []).map((element, index) => ({ ...element, id: `el-${Date.now()}-${index}` }));
    const next = { ...content, sections: [...content.sections] };
    next.sections.splice(parentSectionIndex + 1, 0, copy);
    onChange(next);
  };

  const saveSectionToToolbox = async () => {
    if (selectedType !== "section") return;
    const title = window.prompt("Name this reusable FirstPick Toolbox block", itemToEdit.label || itemToEdit.type);
    if (!title?.trim()) return;
    try {
      await fetchApi("/api/owner-studio/toolbox", {
        method: "POST",
        body: JSON.stringify({ title: title.trim(), section: itemToEdit }),
      });
      window.alert("Saved to FirstPick Toolbox.");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "Could not save this Toolbox block.");
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
      <div className="p-4 border-b border-white/5 flex items-center justify-between shrink-0 bg-black">
        <div className="flex items-center gap-2 text-gray-300">
          <Settings2 className="h-4 w-4 text-primary" />
          <h3 className="text-xs font-black uppercase tracking-wider">
            Edit {selectedType}
          </h3>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5 custom-scrollbar">
        {selectedType === "section" && (
          <SectionProperties section={itemToEdit} onChange={updateItem} />
        )}
        
        {selectedType === "element" && (
          <ElementProperties element={itemToEdit} onChange={updateItem} />
        )}
      </div>

      <div className="p-4 border-t border-white/5 bg-black shrink-0">
        {selectedType === "section" && (
          <div className="mb-3 grid grid-cols-2 gap-2">
            <Button size="sm" variant="ghost" onClick={() => moveSection(-1)} disabled={parentSectionIndex === 0} className="text-[10px]"><ArrowUp className="mr-1 h-3.5 w-3.5" />Move up</Button>
            <Button size="sm" variant="ghost" onClick={() => moveSection(1)} disabled={parentSectionIndex === content.sections.length - 1} className="text-[10px]"><ArrowDown className="mr-1 h-3.5 w-3.5" />Move down</Button>
            <Button size="sm" variant="ghost" onClick={duplicateSection} className="text-[10px]"><Copy className="mr-1 h-3.5 w-3.5" />Duplicate</Button>
            {isOwner && <Button size="sm" variant="ghost" onClick={saveSectionToToolbox} className="text-[10px] text-primary hover:text-primary"><Save className="mr-1 h-3.5 w-3.5" />Save block</Button>}
          </div>
        )}
        <Button variant="destructive" onClick={deleteItem} className="w-full text-xs font-black uppercase tracking-wider">
          Delete {selectedType}
        </Button>
      </div>
    </div>
  );
}

function SectionProperties({ section, onChange }: { section: StudioSection, onChange: (u: any) => void }) {
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Section Type</label>
        <select 
          value={section.type} 
          onChange={(e) => onChange({ type: e.target.value })}
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
        >
          <option value="content">Content Block</option>
          <option value="hero">Hero Banner</option>
          <option value="full-screen">Edge-to-Edge</option>
          <option value="split">Image + Text</option>
          <option value="product-showcase">Product Showcase</option>
          <option value="product-grid">Product Grid</option>
          <option value="video-hero">Video Hero</option>
          <option value="banner">Promo Banner</option>
        </select>
      </div>
      
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Section Label (Optional)</label>
        <input 
          value={section.label || ""} 
          onChange={(e) => onChange({ label: e.target.value })}
          placeholder="e.g., NEW ARRIVALS"
          className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg border border-white/10 bg-white/5">
        <div>
          <p className="text-xs font-bold text-white">Hidden</p>
          <p className="text-[9px] text-gray-500 mt-0.5">Hide section from published page</p>
        </div>
        <Switch checked={section.hidden || false} onCheckedChange={(c) => onChange({ hidden: c })} />
      </div>
    </div>
  );
}

function ElementProperties({ element, onChange }: { element: StudioElement, onChange: (u: any) => void }) {
  const t = element.type;
  const scroll = element.scrollAnimation ?? {
    enabled: false,
    start: 20,
    end: 80,
    from: { x: 0, y: 20, scale: 1, rotate: 0, opacity: 1, blur: 0 },
    to: { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1, blur: 0 },
  };
  const updateScroll = (updates: Record<string, unknown>) => onChange({ scrollAnimation: { ...scroll, ...updates } });
  
  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Element Type</label>
        <div className="px-3 py-2 rounded-lg border border-white/5 bg-white/5 text-xs text-gray-400 capitalize font-bold">
          {t}
        </div>
      </div>

      {(t === "text" || t === "heading" || t === "button" || t === "badge") && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Text Content</label>
          {t === "text" ? (
            <textarea 
              value={element.text || element.label || ""} 
              onChange={(e) => onChange({ text: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60 min-h-[100px] resize-none"
            />
          ) : (
            <input 
              value={element.text || element.label || ""} 
              onChange={(e) => onChange({ text: e.target.value })}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
            />
          )}
        </div>
      )}

      {(t === "image") && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Image URL</label>
          <input 
            value={element.imageUrl || element.url || ""} 
            onChange={(e) => onChange({ imageUrl: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
          />
        </div>
      )}

      {(t === "video") && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Video URL (MP4)</label>
          <input 
            value={element.url || ""} 
            onChange={(e) => onChange({ url: e.target.value })}
            placeholder="https://..."
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
          />
        </div>
      )}

      {(t === "button" || t === "link" || t === "image") && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase tracking-wider text-gray-500">Link URL (Optional)</label>
          <input 
            value={element.href || element.url || ""} 
            onChange={(e) => onChange({ href: e.target.value })}
            placeholder="/shop or https://..."
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
          />
        </div>
      )}

      {t === "product" && (
        <div className="space-y-1.5 p-3 border border-orange-500/30 bg-orange-500/5 rounded-lg">
          <label className="text-[10px] font-black uppercase tracking-wider text-orange-400">Bind Product ID</label>
          <input 
            value={element.productId || ""} 
            onChange={(e) => onChange({ productId: e.target.value })}
            placeholder="e.g. prod_123"
            className="w-full rounded-md border border-orange-500/20 bg-black px-3 py-2 text-xs text-white outline-none focus:border-orange-500 mt-2"
          />
          <p className="text-[9px] text-orange-200/50 mt-1">Input the ID of the product to feature here.</p>
        </div>
      )}

      <div className="pt-4 border-t border-white/5 space-y-3">
        <p className="text-[10px] font-black uppercase tracking-wider text-gray-500">Animation</p>
        
        <div className="space-y-1.5">
          <label className="text-[9px] text-gray-400 uppercase font-bold">Preset</label>
          <select 
            value={element.animation?.preset || "fade"} 
            onChange={(e) => onChange({ animation: { ...element.animation, preset: e.target.value } })}
            className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
          >
            <option value="none">No entrance animation</option>
            <option value="fade">Fade In</option>
            <option value="slide-up">Slide Up</option>
            <option value="slide-down">Slide Down</option>
            <option value="slide-left">Slide Left</option>
            <option value="slide-right">Slide Right</option>
            <option value="zoom-in">Zoom In</option>
            <option value="pop-in">Pop In</option>
            <option value="bounce-in">Bounce In</option>
            <option value="blur-in">Blur In</option>
            <option value="rotate-in">Rotate In</option>
            <option value="flip-in">Flip In</option>
            <option value="float">Float</option>
            <option value="pulse">Pulse</option>
            <option value="wiggle">Wiggle</option>
            <option value="glow-pulse">Glow Pulse</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <label className="text-[9px] text-gray-400 uppercase font-bold">Duration (s)</label>
            <input 
              type="number" step="0.1" min="0.1"
              value={element.animation?.duration || 0.45} 
              onChange={(e) => onChange({ animation: { ...element.animation, duration: parseFloat(e.target.value) } })}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-[9px] text-gray-400 uppercase font-bold">Delay (s)</label>
            <input 
              type="number" step="0.1" min="0"
              value={element.animation?.delay || 0} 
              onChange={(e) => onChange({ animation: { ...element.animation, delay: parseFloat(e.target.value) } })}
              className="w-full rounded-lg border border-white/10 bg-black px-3 py-2 text-xs text-white outline-none focus:border-primary/60"
            />
          </div>
        </div>

        <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-wider text-primary">Scroll animation</p>
              <p className="mt-0.5 text-[9px] leading-3 text-gray-500">Set a start and end state. FirstPick fills in the movement.</p>
            </div>
            <Switch checked={scroll.enabled === true} onCheckedChange={(enabled) => updateScroll({ enabled })} />
          </div>
          {scroll.enabled && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="text-[9px] text-gray-400">Start marker (%)
                  <input type="number" min="0" max="99" value={scroll.start ?? 20} onChange={(event) => updateScroll({ start: Number(event.target.value) })} className="mt-1 w-full rounded border border-white/10 bg-black px-2 py-1.5 text-xs text-white outline-none" />
                </label>
                <label className="text-[9px] text-gray-400">End marker (%)
                  <input type="number" min="1" max="100" value={scroll.end ?? 80} onChange={(event) => updateScroll({ end: Number(event.target.value) })} className="mt-1 w-full rounded border border-white/10 bg-black px-2 py-1.5 text-xs text-white outline-none" />
                </label>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">Start position</p>
              <MotionFields value={scroll.from} onChange={(from) => updateScroll({ from })} />
              <p className="text-[9px] font-bold uppercase tracking-wider text-gray-400">End position</p>
              <MotionFields value={scroll.to} onChange={(to) => updateScroll({ to })} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function MotionFields({ value, onChange }: { value: Record<string, number>; onChange: (value: Record<string, number>) => void }) {
  const fields = [
    ["x", "X"], ["y", "Y"], ["scale", "Scale"], ["rotate", "Rotate"], ["opacity", "Opacity"],
  ] as const;
  return (
    <div className="grid grid-cols-2 gap-2">
      {fields.map(([key, label]) => (
        <label key={key} className="text-[9px] text-gray-500">{label}
          <input type="number" step={key === "scale" || key === "opacity" ? "0.1" : "1"} value={value?.[key] ?? (key === "scale" || key === "opacity" ? 1 : 0)} onChange={(event) => onChange({ ...value, [key]: Number(event.target.value) })} className="mt-1 w-full rounded border border-white/10 bg-black px-2 py-1.5 text-xs text-white outline-none" />
        </label>
      ))}
    </div>
  );
}
