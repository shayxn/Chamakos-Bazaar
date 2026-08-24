import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Monitor, Smartphone, Tablet, Trash2, Copy, Play, Settings2, Settings, Box, Code, RotateCcw, Undo2, Redo2, Plus, Laptop } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Page, PageContent } from "./types";
import { CanvasPreview } from "./canvas-preview";
import { PropertiesPanel } from "./properties-panel";
import { Toolbox } from "./toolbox";
import { VersionsPanel } from "./versions-panel";

export function PageEditor({ 
  page, 
  isOwner, 
  onChange, 
  onDelete 
}: { 
  page: Page; 
  isOwner: boolean; 
  onChange: (p: Page) => void; 
  onDelete: (id: number) => void 
}) {
  const { toast } = useToast();
  const [device, setDevice] = useState<"phone" | "tablet" | "laptop" | "desktop">("desktop");
  const [landscape, setLandscape] = useState(false);
  const [saving, setSaving] = useState(false);
  const [content, setContent] = useState<PageContent>(page.content || { sections: [] });
  const [undoStack, setUndoStack] = useState<PageContent[]>([]);
  const [redoStack, setRedoStack] = useState<PageContent[]>([]);
  const [title, setTitle] = useState(page.title);
  const [slug, setSlug] = useState(page.slug);
  
  const [rightPanel, setRightPanel] = useState<"toolbox" | "properties" | "json" | "history" | "closed">("toolbox");
  
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<"section" | "element" | null>(null);

  // Sync title/slug updates
  useEffect(() => {
    setTitle(page.title);
    setSlug(page.slug);
  }, [page.id, page.title, page.slug]);

  // To handle auto-save debounce
  const timeoutRef = useRef<NodeJS.Timeout>();

  const saveUpdates = useCallback(async (updates: Partial<Page>) => {
    try {
      setSaving(true);
      const res = await fetchApi(`/api/owner-studio/pages/${page.id}`, {
        method: "PATCH",
        body: JSON.stringify({ ...updates, version: page.version })
      });
      onChange(res);
    } catch (err: any) {
      toast({ title: "Failed to save", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }, [page.id, page.version, onChange, toast]);

  // Content change handler with debounce
  const cloneContent = (value: PageContent) => JSON.parse(JSON.stringify(value)) as PageContent;
  const queueSave = (newContent: PageContent) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      saveUpdates({ content: newContent });
    }, 1000);
  };

  const handleContentChange = (newContent: PageContent, recordHistory = true) => {
    if (recordHistory) {
      setUndoStack((previous) => [...previous.slice(-29), cloneContent(content)]);
      setRedoStack([]);
    }
    setContent(newContent);
    queueSave(newContent);
  };

  const handleUndo = () => {
    const previous = undoStack[undoStack.length - 1];
    if (!previous) return;
    setUndoStack((items) => items.slice(0, -1));
    setRedoStack((items) => [cloneContent(content), ...items].slice(0, 30));
    handleContentChange(cloneContent(previous), false);
  };

  const handleRedo = () => {
    const next = redoStack[0];
    if (!next) return;
    setRedoStack((items) => items.slice(1));
    setUndoStack((items) => [...items.slice(-29), cloneContent(content)]);
    handleContentChange(cloneContent(next), false);
  };
  const handlePublish = async () => {
    try {
      setSaving(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      await saveUpdates({ content });
      const res = await fetchApi(`/api/owner-studio/pages/${page.id}/publish`, { method: "POST" });
      onChange(res);
      toast({ title: "Page Published!" });
    } catch (err: any) {
      toast({ title: "Publish failed", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDuplicate = async () => {
    try {
      await fetchApi(`/api/owner-studio/pages/${page.id}/duplicate`, { method: "POST" });
      toast({ title: "Page Duplicated", description: "Refresh or check sidebar." });
    } catch (err: any) {
      toast({ title: "Duplicate failed", description: err.message, variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this page?")) return;
    try {
      await fetchApi(`/api/owner-studio/pages/${page.id}`, { method: "DELETE" });
      onDelete(page.id);
      toast({ title: "Page deleted" });
    } catch (err: any) {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    }
  };

  const handleSelect = (id: string, type: "section" | "element") => {
    setSelectedId(id);
    setSelectedType(type);
    setRightPanel("properties");
  };

  const handleAddSection = (type: string) => {
    const newSec = {
      id: `sec-${Date.now()}`,
      type,
      label: "New " + type,
      elements: [],
      motion: { start: { opacity: 0, y: 20 }, end: { opacity: 1, y: 0 } }
    };
    const newContent = { ...content, sections: [...(content.sections || []), newSec] };
    handleContentChange(newContent);
    handleSelect(newSec.id, "section");
  };

  const handleInsertSection = (source: PageContent["sections"][number]) => {
    const copied = cloneContent({ sections: [source] }).sections[0];
    const id = `sec-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newSec = {
      ...copied,
      id,
      elements: (copied.elements ?? []).map((element, index) => ({ ...element, id: `el-${Date.now()}-${index}` })),
    };
    handleContentChange({ ...content, sections: [...content.sections, newSec] });
    handleSelect(id, "section");
  };

  const handleAddElement = (sectionId: string, el: Record<string, unknown>) => {
    const newContent = cloneContent(content);
    const sIdx = newContent.sections.findIndex(s => s.id === sectionId);
    if (sIdx > -1) {
      const newEl = { id: `el-${Date.now()}`, ...el };
      if (!newContent.sections[sIdx].elements) newContent.sections[sIdx].elements = [];
      newContent.sections[sIdx].elements.push(newEl);
      handleContentChange(newContent);
      handleSelect(newEl.id, "element");
    }
  };

  const handleCanvasDrop = (payload: Record<string, unknown>, sectionId?: string) => {
    if (payload.kind === "section" && typeof payload.sectionType === "string") {
      handleAddSection(payload.sectionType);
      return;
    }
    if (payload.kind === "saved-section" && payload.section && typeof payload.section === "object") {
      handleInsertSection(payload.section as PageContent["sections"][number]);
      return;
    }
    if (payload.kind === "element" && payload.element && typeof payload.element === "object") {
      const target = sectionId || activeSectionId || content.sections[content.sections.length - 1]?.id;
      if (target) handleAddElement(target, payload.element as Record<string, unknown>);
      else {
        handleAddSection("content");
        toast({ title: "Section added", description: "Drop the element into the new section to finish." });
      }
    }
  };
  
  // Find selected section id for Toolbox
  let activeSectionId = null;
  if (selectedType === "section") activeSectionId = selectedId;
  else if (selectedType === "element" && selectedId) {
    const s = content.sections.find(sec => (sec.elements || []).some(e => e.id === selectedId));
    if (s) activeSectionId = s.id;
  }

  // JSON editor local state
  const [jsonStr, setJsonStr] = useState("");
  useEffect(() => {
    if (rightPanel === "json") setJsonStr(JSON.stringify(content, null, 2));
  }, [rightPanel, content]);

  return (
    <div className="flex-1 flex flex-col min-w-0 h-full">
      {/* Editor Header */}
      <header className="h-14 border-b border-white/5 bg-[#0a0a0a] flex items-center justify-between px-2 sm:px-4 shrink-0 overflow-x-auto scrollbar-hide">
        <div className="flex items-center gap-2 sm:gap-4 shrink-0">
          <div className="flex flex-col w-24 sm:w-auto">
            <input 
              value={title} 
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => { if(title !== page.title) saveUpdates({ title }) }}
              className="bg-transparent text-sm font-bold text-white outline-none placeholder:text-gray-600 truncate"
              placeholder="Page Title"
            />
            <div className="flex items-center text-[10px] text-gray-500 font-mono">
              <span className="opacity-50 hidden sm:inline">/</span>
              <input 
                value={slug} 
                onChange={(e) => setSlug(e.target.value)}
                onBlur={() => { if(slug !== page.slug) saveUpdates({ slug }) }}
                className="bg-transparent outline-none flex-1 placeholder:text-gray-600 min-w-[80px] sm:min-w-[120px] truncate"
                placeholder="slug"
              />
            </div>
          </div>
          
          <div className="h-6 w-px bg-white/10 mx-1 sm:mx-2 shrink-0" />
          
          <div className="flex items-center rounded-lg bg-black p-1 border border-white/5 shrink-0">
            <button 
              onClick={() => setDevice("phone")} 
              title="Phone preview"
              className={`p-1.5 rounded-md transition-colors ${device === "phone" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}
            >
              <Smartphone className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setDevice("tablet")} 
              title="Tablet preview"
              className={`p-1.5 rounded-md transition-colors ${device === "tablet" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}
            >
              <Tablet className="h-3.5 w-3.5" />
            </button>
            <button onClick={() => setDevice("laptop")} title="Laptop preview" className={`hidden sm:block p-1.5 rounded-md transition-colors ${device === "laptop" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}><Laptop className="h-3.5 w-3.5" /></button>
            <button onClick={() => setDevice("desktop")} title="Desktop preview" className={`p-1.5 rounded-md transition-colors ${device === "desktop" ? "bg-white/10 text-white" : "text-gray-500 hover:text-white"}`}><Monitor className="h-3.5 w-3.5" /></button>
          </div>
          <button onClick={() => setLandscape((value) => !value)} className={`hidden md:block rounded-md border px-2 py-1 text-[9px] font-black uppercase tracking-wider ${landscape ? "border-primary/40 bg-primary/10 text-primary" : "border-white/10 text-gray-500 hover:text-white"}`}>
            {landscape ? "Landscape" : "Portrait"}
          </button>
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          {saving && <span className="text-[10px] font-bold text-primary animate-pulse mr-1 sm:mr-2 hidden sm:inline">SAVING...</span>}
          <Button variant="ghost" size="icon" onClick={handleUndo} disabled={!undoStack.length} title="Undo" className="text-gray-400 hover:text-white disabled:opacity-30 shrink-0"><Undo2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={handleRedo} disabled={!redoStack.length} title="Redo" className="text-gray-400 hover:text-white disabled:opacity-30 shrink-0"><Redo2 className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={() => setRightPanel("toolbox")} title="Open FirstPick Toolbox" className="text-primary hover:text-primary shrink-0"><Plus className="h-4 w-4" /></Button>
          <Button variant="ghost" size="icon" onClick={handleDuplicate} className="text-gray-400 hover:text-white shrink-0"><Copy className="h-4 w-4" /></Button>
          {isOwner && <Button variant="ghost" size="icon" onClick={handleDelete} className="text-red-400 hover:text-red-300 hover:bg-red-400/10 shrink-0"><Trash2 className="h-4 w-4" /></Button>}
          {isOwner && <Button 
            className="h-8 text-xs font-black uppercase tracking-wider bg-white text-black hover:bg-gray-200 ml-1 sm:ml-2 px-2 sm:px-4" 
            onClick={handlePublish}
            disabled={saving}
          >
            <Play className="sm:mr-1.5 h-3.5 w-3.5" fill="currentColor" />
            <span className="hidden sm:inline">Publish</span>
          </Button>}
          <Button
            variant="ghost"
            size="icon"
            className="xl:hidden ml-1 text-gray-400 hover:text-white shrink-0"
            onClick={() => setRightPanel(rightPanel === "closed" ? "toolbox" : "closed")}
          >
            <Settings2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        {/* Preview Canvas */}
        <div className="flex-1 bg-[#050505] p-2 sm:p-6 flex justify-center overflow-y-auto relative custom-scrollbar" onClick={() => { setSelectedId(null); setSelectedType(null); }}>
          <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, rgba(255,255,255,0.05) 1px, transparent 0)', backgroundSize: '24px 24px' }} />
          
          <motion.div 
            layout
            initial={false}
            animate={{ width: landscape ? (device === "phone" ? 740 : device === "tablet" ? 1024 : 1200) : (device === "phone" ? 390 : device === "tablet" ? 768 : device === "laptop" ? 1024 : "100%"), maxWidth: landscape ? 1200 : (device === "phone" ? 390 : device === "tablet" ? 768 : device === "laptop" ? 1024 : 1200) }}
            className={`relative bg-black rounded-xl border border-white/10 shadow-2xl overflow-hidden min-h-[500px] flex flex-col ${device === "phone" ? "mt-4" : ""}`}
            style={{ transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)" }}
          >
            {/* Fake browser bar for preview */}
            <div className="h-8 border-b border-white/5 bg-[#0a0a0a] flex items-center px-3 gap-1.5 opacity-50 shrink-0">
              <div className="h-2 w-2 rounded-full bg-red-500/50" />
              <div className="h-2 w-2 rounded-full bg-yellow-500/50" />
              <div className="h-2 w-2 rounded-full bg-green-500/50" />
            </div>
            
            <div className="flex-1 overflow-y-auto relative">
                <CanvasPreview content={content} selectedId={selectedId} onSelect={handleSelect} onDropItem={handleCanvasDrop} />
            </div>
          </motion.div>
        </div>

        {/* Right Panel Container */}
        <div className={`
          absolute inset-y-0 right-0 z-10 transform transition-transform duration-300 xl:relative xl:transform-none flex flex-col w-80 shrink-0 border-l border-white/5 bg-[#0a0a0a] shadow-2xl xl:shadow-none
          ${rightPanel !== "closed" ? "translate-x-0" : "translate-x-full xl:translate-x-0"}
        `}>
          {/* Panel Tabs */}
          <div className="flex items-center p-2 border-b border-white/5 bg-black shrink-0">
            {[
              { id: "toolbox", icon: Box, label: "Add" },
              { id: "properties", icon: Settings, label: "Edit" },
              { id: "json", icon: Code, label: "Code" },
              { id: "history", icon: RotateCcw, label: "Hist" }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setRightPanel(tab.id as any)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[10px] font-black uppercase tracking-wider rounded-md transition-colors ${
                  rightPanel === tab.id ? "bg-primary/20 text-primary" : "text-gray-500 hover:text-gray-300 hover:bg-white/5"
                }`}
              >
                <tab.icon className="h-3.5 w-3.5 hidden xl:block" /> {tab.label}
              </button>
            ))}
          </div>
          
          <div className="flex-1 flex flex-col min-h-0">
            {rightPanel === "toolbox" && (
              <Toolbox 
                onAddSection={handleAddSection} 
                onAddElement={handleAddElement} 
                  onInsertSection={handleInsertSection}
                selectedSectionId={activeSectionId} 
              />
            )}
            
            {rightPanel === "properties" && (
              <PropertiesPanel 
                content={content} 
                selectedId={selectedId} 
                selectedType={selectedType}
                onChange={handleContentChange}
                onClose={() => { setSelectedId(null); setSelectedType(null); }}
                isOwner={isOwner}
              />
            )}
            
            {rightPanel === "json" && (
              <div className="flex-1 flex flex-col p-4 relative min-h-0 bg-[#0a0a0a]">
                <textarea 
                  value={jsonStr}
                  onChange={(e) => setJsonStr(e.target.value)}
                  className="flex-1 w-full resize-none bg-[#050505] border border-white/10 rounded-lg p-3 text-[11px] font-mono text-gray-300 outline-none focus:border-primary/50 transition-colors custom-scrollbar"
                  spellCheck={false}
                />
                <Button 
                  onClick={() => {
                    try {
                      const p = JSON.parse(jsonStr);
                      handleContentChange(p);
                      toast({ title: "JSON Applied" });
                    } catch (e: any) {
                      toast({ title: "Invalid JSON", description: e.message, variant: "destructive" });
                    }
                  }}
                  className="mt-4 w-full fire-gradient text-white border-none font-black uppercase tracking-wider shrink-0"
                >
                  Apply Code
                </Button>
              </div>
            )}

            {rightPanel === "history" && (
              <VersionsPanel pageId={page.id} canRestore={isOwner} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
