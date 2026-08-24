import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Version } from "./types";

export function VersionsPanel({ pageId, canRestore }: { pageId: number, canRestore: boolean }) {
  const { toast } = useToast();
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(true);

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
      await fetchApi(`/api/owner-studio/pages/${pageId}/restore/${versionNumber}`, { method: "POST" });
      toast({ title: "Restored", description: "Page restored successfully. Refresh to see changes." });
      window.location.reload();
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
          <div key={v.version} className="flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 hover:border-primary/50 transition-colors">
            <div>
              <p className="text-[10px] font-bold text-gray-300">v{v.version}</p>
              <p className="text-[9px] text-gray-500 mt-1">{new Date(v.createdAt).toLocaleString()}</p>
            </div>
            {canRestore && (
              <Button size="sm" variant="ghost" onClick={() => handleRestore(v.version)} className="h-6 text-[10px] text-primary hover:text-primary hover:bg-primary/10">
                Restore
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
