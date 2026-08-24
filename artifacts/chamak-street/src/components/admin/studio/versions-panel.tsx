import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronRight, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Page, Version } from "./types";

export function VersionsPanel({ pageId, canRestore, onRestored }: { pageId: number, canRestore: boolean, onRestored: (page: Page) => void }) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);
  const [previewVersion, setPreviewVersion] = useState<Version | null>(null);

  const fetchVersions = async () => {
    setLoading(true);
    try {
      const data = await fetchApi(`/api/owner-studio/pages/${pageId}/versions`);
      setVersions(data);
    } catch (e: any) {
      toast({ title: "Could not load versions", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVersions();
  }, [pageId]);

  const handleRestore = async (versionNumber: number) => {
    if (!confirm(`Restore version ${versionNumber}? Unsaved changes will be lost.`)) return;
    try {
      const page = await fetchApi(`/api/owner-studio/pages/${pageId}/restore/${versionNumber}`, { method: "POST" }) as Page;
      onRestored(page);
      await fetchVersions();
      toast({ title: "Restored", description: `Version ${versionNumber} is now loaded in the editor.` });
    } catch (e: any) {
      toast({ title: "Restore failed", description: e.message, variant: "destructive" });
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
      <div className="p-4 border-b border-white/5 bg-black shrink-0">
        <h3 className="text-xs font-black uppercase tracking-wider text-white">Page History</h3>
        <p className="text-[10px] text-gray-500 mt-1">Restore previous versions of this page.</p>
      </div>

      <div className="flex-1 p-4 space-y-2 overflow-y-auto custom-scrollbar">
        {loading && <p className="text-[10px] text-gray-500">Loading...</p>}
        {!loading && versions.length === 0 && <p className="text-[10px] text-gray-500">No versions found.</p>}
        {versions.map(v => (
          <div key={v.version} className="rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 transition-colors">
            <div className="flex items-center justify-between p-3">
              <div>
                <p className="text-[10px] font-bold text-gray-300">v{v.version}</p>
                <p className="text-[9px] text-gray-500 mt-1">{new Date(v.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button size="sm" variant="ghost" onClick={() => setPreviewVersion(previewVersion?.version === v.version ? null : v)} className="h-6 px-2 text-[10px] text-gray-400 hover:text-white"><Eye className="mr-1 h-3 w-3" />View</Button>
                {canRestore && (
                  <Button size="sm" variant="ghost" onClick={() => handleRestore(v.version)} className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/10">
                    Restore
                  </Button>
                )}
              </div>
            </div>
            {previewVersion?.version === v.version && (
              <div className="border-t border-white/5 px-3 py-2.5 text-[10px] text-gray-500">
                <p className="font-black uppercase tracking-wider text-gray-400">{Array.isArray((v.content as any)?.sections) ? `${(v.content as any).sections.length} sections` : "Saved page snapshot"}</p>
                <p className="mt-1 truncate">{((v.content as any)?.sections ?? []).map((section: any) => section.label || section.type).filter(Boolean).join(" · ") || "Empty canvas"}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
