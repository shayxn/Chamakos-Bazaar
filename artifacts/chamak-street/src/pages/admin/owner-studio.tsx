import { useState, useEffect } from "react";
import { AnimatePresence } from "framer-motion";
import { 
  Zap, Monitor, Volume2, AlertTriangle, Shield, Code2
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "@/components/admin/studio/api";
import { Access } from "@/components/admin/studio/types";
import { PagesManager } from "@/components/admin/studio/pages-manager";
import { SoundsManager } from "@/components/admin/studio/sounds-manager";
import { GrantsManager } from "@/components/admin/studio/grants-manager";
import { CodeValidator } from "@/components/admin/studio/code-validator";

export default function OwnerStudio() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [access, setAccess] = useState<Access | null>(null);
  
  const [activeTab, setActiveTab] = useState<"pages" | "sounds" | "grants" | "code">("pages");
  
  useEffect(() => {
    fetchApi("/api/owner-studio/access")
      .then((data) => {
        setAccess(data);
        setLoading(false);
      })
      .catch((err) => {
        toast({ title: "Access Denied", description: err.message, variant: "destructive" });
        setLoading(false);
      });
  }, [toast]);

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-[#050505] min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <Zap className="h-8 w-8 text-primary animate-pulse" />
          <p className="text-xs font-bold uppercase tracking-widest text-primary">Initializing Studio...</p>
        </div>
      </div>
    );
  }

  if (!access?.canAccess) {
    return (
      <div className="flex h-full items-center justify-center bg-[#050505] p-6 text-center min-h-screen">
        <div className="max-w-md rounded-2xl border border-red-500/20 bg-red-500/5 p-8 backdrop-blur-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h1 className="text-xl font-black uppercase tracking-wide text-white">Restricted Area</h1>
          <p className="mt-2 text-sm text-gray-400">
            You do not have access to the Owner Studio. Contact the store owner to request permissions.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full flex-col bg-[#050505] font-sans text-gray-200 selection:bg-primary/30">
      {/* Top Navigation */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-white/5 bg-[#0a0a0a] px-4 md:px-6 z-20">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Zap className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-black uppercase tracking-wider text-white">Owner Studio</h1>
            <p className="text-[10px] text-gray-500 font-mono">v2.0 // CREATIVE CONTROL</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-1 rounded-xl bg-black p-1 shadow-inner border border-white/5 overflow-x-auto scrollbar-hide max-w-[60vw]">
          {[
            { id: "pages", label: "Pages", icon: Monitor },
            ...(access.isOwner ? [{ id: "sounds", label: "Sounds", icon: Volume2 }] : []),
            { id: "code", label: "Custom Code", icon: Code2 },
            ...(access.isOwner ? [{ id: "grants", label: "Grants", icon: Shield }] : [])
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap ${
                activeTab === tab.id
                  ? "bg-primary/20 text-primary shadow-sm"
                  : "text-gray-500 hover:bg-white/5 hover:text-gray-300"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </nav>
      </header>

      {/* Main Content Area */}
      <main className="flex flex-1 overflow-hidden relative">
        <AnimatePresence mode="wait">
          {activeTab === "pages" && <PagesManager key="pages" access={access} />}
          {activeTab === "sounds" && access.isOwner && <SoundsManager key="sounds" />}
          {activeTab === "grants" && access.isOwner && <GrantsManager key="grants" access={access} />}
          {activeTab === "code" && <CodeValidator key="code" isOwner={access.isOwner} />}
        </AnimatePresence>
      </main>
    </div>
  );
}
