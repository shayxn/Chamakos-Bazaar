import { useEffect, useMemo, useState } from "react";
import {
  AlignCenter, AlignLeft, Box, CircleDot, Columns2, Contact, Image as ImageIcon,
  LayoutTemplate, MousePointerClick, Package, PanelsTopLeft, PlaySquare, Search,
  Sparkles, Tag, Type, Video,
} from "lucide-react";
import { fetchApi } from "./api";
import { StudioSection, ToolboxItem } from "./types";

type ToolboxEntry = {
  type: string;
  label: string;
  category: string;
  description: string;
  icon: typeof Type;
  default?: Record<string, unknown>;
};

const SECTION_PRESETS: ToolboxEntry[] = [
  { type: "hero", label: "Hero", category: "Sections", description: "A bold page opener", icon: PanelsTopLeft },
  { type: "product-showcase", label: "Product Showcase", category: "Sections", description: "Focus attention on one item", icon: Package },
  { type: "product-grid", label: "Product Grid", category: "Sections", description: "A shoppable product area", icon: LayoutTemplate },
  { type: "split", label: "Image + Text", category: "Sections", description: "Two-column storytelling", icon: Columns2 },
  { type: "video-hero", label: "Video Hero", category: "Sections", description: "Motion-led campaign opener", icon: PlaySquare },
  { type: "banner", label: "Promo Banner", category: "Sections", description: "A compact campaign message", icon: Sparkles },
  { type: "faq", label: "FAQ", category: "Sections", description: "Helpful answers in one block", icon: Contact },
  { type: "full-screen", label: "Full Screen", category: "Layout", description: "An immersive edge-to-edge section", icon: Box },
  { type: "content", label: "Container", category: "Layout", description: "A flexible content block", icon: AlignCenter },
];

const ELEMENT_PRESETS: ToolboxEntry[] = [
  { type: "heading", label: "Heading", category: "Text", description: "Large campaign headline", icon: Type, default: { text: "New Heading", fontFamily: "firstpick", animation: { preset: "slide-up", duration: 0.45 } } },
  { type: "subheading", label: "Subheading", category: "Text", description: "Supporting statement", icon: AlignLeft, default: { text: "A sharp supporting line.", fontFamily: "firstpick", animation: { preset: "fade", duration: 0.45 } } },
  { type: "text", label: "Paragraph", category: "Text", description: "Longer page copy", icon: AlignLeft, default: { text: "Add your text here...", fontFamily: "firstpick", animation: { preset: "fade", duration: 0.45 } } },
  { type: "badge", label: "Badge", category: "Text", description: "A small highlighted label", icon: Tag, default: { text: "NEW ARRIVAL", animation: { preset: "pop-in", duration: 0.38 } } },
  { type: "button", label: "Button", category: "Buttons", description: "A clear call to action", icon: MousePointerClick, default: { text: "EXPLORE", href: "/shop", animation: { preset: "fade", duration: 0.42 } } },
  { type: "image", label: "Image", category: "Media", description: "Add a media-library or HTTPS image", icon: ImageIcon, default: { imageUrl: "", animation: { preset: "zoom-in", duration: 0.55 } } },
  { type: "video", label: "Video", category: "Media", description: "Add a FirstPick or HTTPS video", icon: Video, default: { url: "", animation: { preset: "fade", duration: 0.5 } } },
  { type: "product", label: "Product Spotlight", category: "Products", description: "Bind a real FirstPick product ID", icon: Package, default: { productId: "", animation: { preset: "slide-up", duration: 0.45 } } },
  { type: "divider", label: "Divider", category: "Layout", description: "Create visual breathing room", icon: CircleDot, default: { animation: { preset: "fade", duration: 0.32 } } },
];

function dragPayload(event: React.DragEvent, payload: Record<string, unknown>) {
  event.dataTransfer.effectAllowed = "copy";
  event.dataTransfer.setData("application/x-firstpick-studio", JSON.stringify(payload));
}

export function Toolbox({
  onAddSection,
  onAddElement,
  onInsertSection,
  selectedSectionId,
}: {
  onAddSection: (type: string) => void;
  onAddElement: (sectionId: string, el: Record<string, unknown>) => void;
  onInsertSection: (section: StudioSection) => void;
  selectedSectionId: string | null;
}) {
  const [search, setSearch] = useState("");
  const [savedItems, setSavedItems] = useState<ToolboxItem[]>([]);

  useEffect(() => {
    let mounted = true;
    fetchApi("/api/owner-studio/toolbox")
      .then((data) => mounted && setSavedItems(data.items ?? []))
      .catch(() => mounted && setSavedItems([]));
    return () => { mounted = false; };
  }, []);

  const query = search.trim().toLowerCase();
  const entries = useMemo(
    () => [...SECTION_PRESETS, ...ELEMENT_PRESETS].filter((entry) =>
      !query || [entry.label, entry.category, entry.description, entry.type].some((value) => value.toLowerCase().includes(query)),
    ),
    [query],
  );
  const categories = ["Sections", "Text", "Products", "Media", "Buttons", "Layout"];

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
      <div className="p-4 border-b border-white/5 bg-black shrink-0">
        <h3 className="text-xs font-black uppercase tracking-wider text-white">FirstPick Toolbox</h3>
        <p className="text-[10px] text-gray-500 mt-1">Click or drag a block onto the page.</p>
        <div className="relative mt-3">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-gray-500" />
          <input 
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search elements..."
            className="w-full rounded-lg border border-white/10 bg-[#050505] pl-8 pr-3 py-2 text-xs text-white outline-none focus:border-primary/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
        {savedItems.length > 0 && !query && (
          <div>
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-primary">Your saved blocks</p>
            <div className="grid gap-2">
              {savedItems.map((item) => (
                <button
                  key={item.id}
                  draggable
                  onDragStart={(event) => dragPayload(event, { kind: "saved-section", section: item.section })}
                  onClick={() => onInsertSection(item.section)}
                  className="flex items-center gap-3 rounded-lg border border-primary/25 bg-primary/5 p-3 text-left transition-colors hover:border-primary/60 hover:bg-primary/10"
                >
                  <Box className="h-4 w-4 shrink-0 text-primary" />
                  <span className="min-w-0 truncate text-xs font-bold text-gray-200">{item.title}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {categories.map((category) => {
          const matches = entries.filter((entry) => entry.category === category);
          if (!matches.length) return null;
          return (
            <div key={category}>
              <div className="mb-2 flex items-center justify-between">
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">{category}</p>
                {category !== "Sections" && category !== "Layout" && !selectedSectionId && (
                  <p className="text-[9px] text-orange-400">Choose a section</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {matches.map((entry) => {
                  const sectionEntry = SECTION_PRESETS.includes(entry);
                  const disabled = !sectionEntry && !selectedSectionId;
                  return (
                    <button
                      key={`${category}-${entry.type}`}
                      draggable={!disabled}
                      disabled={disabled}
                      onDragStart={(event) => dragPayload(event, sectionEntry
                        ? { kind: "section", sectionType: entry.type }
                        : { kind: "element", element: { type: entry.type, ...entry.default } })}
                      onClick={() => sectionEntry
                        ? onAddSection(entry.type)
                        : selectedSectionId && onAddElement(selectedSectionId, { type: entry.type, ...entry.default })}
                      className="group flex flex-col rounded-lg border border-white/10 bg-white/5 p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/5 disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <entry.icon className="mb-2 h-5 w-5 text-gray-400 group-hover:text-primary" />
                      <span className="text-[10px] font-bold text-gray-200 group-hover:text-primary">{entry.label}</span>
                      <span className="mt-0.5 text-[9px] leading-3 text-gray-500">{entry.description}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
        {entries.length === 0 && <p className="py-8 text-center text-[10px] text-gray-500">No toolbox blocks match your search.</p>}
      </div>
    </div>
  );
}
