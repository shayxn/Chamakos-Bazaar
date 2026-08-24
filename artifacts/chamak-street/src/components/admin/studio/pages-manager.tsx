import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Page, Access } from "./types";
import { PageEditor } from "./page-editor";

export function PagesManager({ access }: { access: Access }) {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newType, setNewType] = useState<"store" | "admin">("store");

  const fetchPages = useCallback(async () => {
    try {
      const data = await fetchApi("/api/owner-studio/pages");
      setPages(data);
    } catch (err: any) {
      toast({ title: "Failed to load pages", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleCreate = async () => {
    const title = newTitle.trim() || (newType === "admin" ? "New Admin Page" : "New Store Page");
    const slug = newSlug.trim() || `${newType}-page-${Date.now()}`;
    try {
      const page = await fetchApi("/api/owner-studio/pages", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug,
          pageType: newType
        })
      });
      setPages((prev) => [page, ...prev]);
      setSelectedId(page.id);
      setCreateOpen(false);
      setNewTitle("");
      setNewSlug("");
      toast({ title: "Page created" });
    } catch (err: any) {
      toast({ title: "Creation failed", description: err.message, variant: "destructive" });
    }
  };

  const selectedPage = pages.find((p) => p.id === selectedId) || null;

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex w-full h-full absolute inset-0"
    >
      {/* Sidebar: Page List */}
      <aside className="w-16 sm:w-64 shrink-0 flex-col border-r border-white/5 bg-[#0a0a0a] flex h-full">
        <div className="flex items-center justify-center sm:justify-between p-4 border-b border-white/5 shrink-0">
          <h2 className="hidden sm:block text-xs font-black uppercase tracking-widest text-gray-400">Your Pages</h2>
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-white/10 hover:text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <p className="p-4 text-center text-xs text-gray-600 hidden sm:block">Loading...</p>
          ) : pages.length === 0 ? (
            <p className="p-4 text-center text-xs text-gray-600 hidden sm:block">No pages yet.</p>
          ) : (
            pages.map((p) => (
              <button
                key={p.id}
                onClick={() => setSelectedId(p.id)}
                className={`w-full flex items-center justify-center sm:justify-between rounded-lg p-2 sm:px-3 text-left transition-all ${
                  selectedId === p.id ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="hidden sm:block min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${selectedId === p.id ? "text-primary" : "text-gray-300"}`}>
                    {p.title}
                  </p>
                  <p className="truncate text-[10px] text-gray-500 font-mono">/{p.slug}</p>
                </div>
                <div className="sm:hidden text-xs font-bold text-gray-300">
                  {p.title.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                  {p.status === "published" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                  {p.status === "draft" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Main Editor */}
      <div className="flex-1 flex bg-[#050505] overflow-hidden">
        {selectedPage ? (
          <PageEditor 
            key={selectedPage.id}
            page={selectedPage} 
            isOwner={access.isOwner}
            onChange={(updated) => setPages(pages.map(p => p.id === updated.id ? updated : p))}
            onDelete={(id) => {
              setPages(pages.filter(p => p.id !== id));
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <Monitor className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-wider text-center px-4">Select a page to edit</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.form
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Owner Studio</p>
                  <h2 className="mt-1 text-lg font-black text-white">Create a page</h2>
                </div>
                <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {(["store", "admin"] as const).map((type) => (
                  <button key={type} type="button" onClick={() => setNewType(type)} className={`rounded-xl border px-3 py-3 text-left transition-colors ${newType === type ? "border-primary/60 bg-primary/10 text-primary" : "border-white/10 bg-black text-gray-400 hover:border-white/20"}`}>
                    <span className="block text-xs font-black uppercase tracking-wider">{type === "store" ? "Store page" : "Admin page"}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-current/70">{type === "store" ? "Published safely at its public URL." : "Private at /admin/studio/your-slug."}</span>
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-gray-500">Page name
                <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={newType === "admin" ? "Inventory helper" : "Back to School"} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" />
              </label>
              <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-gray-500">URL slug
                <input value={newSlug} onChange={(event) => setNewSlug(event.target.value)} placeholder={newType === "admin" ? "inventory-helper" : "back-to-school"} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" />
              </label>
              <p className="mt-3 text-[10px] leading-4 text-gray-500">{newType === "admin" ? "Admin pages are never public and default to Owner-only access." : "Store pages remain private drafts until the Owner publishes them."}</p>
              <Button type="submit" className="mt-5 w-full fire-gradient border-none font-black uppercase tracking-wider">Create blank page</Button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
