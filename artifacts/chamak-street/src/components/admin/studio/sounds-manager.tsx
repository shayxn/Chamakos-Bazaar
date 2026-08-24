import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Sound } from "./types";

export function SoundsManager() {
  const { toast } = useToast();
  const [sounds, setSounds] = useState<Record<string, Sound>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi("/api/owner-studio/sounds")
      .then(data => setSounds(data.sounds || {}))
      .catch(err => toast({ title: "Failed to load sounds", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetchApi("/api/owner-studio/sounds", {
        method: "PATCH",
        body: JSON.stringify({ sounds })
      });
      toast({ title: "Sounds updated successfully" });
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const updateSound = (key: string, updates: Partial<Sound>) => {
    setSounds(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  if (loading) return <div className="p-8 text-gray-500 absolute inset-0">Loading sounds...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 sm:p-8 max-w-4xl mx-auto w-full h-full overflow-y-auto absolute inset-0 custom-scrollbar">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white">Sound Design</h2>
          <p className="text-xs text-gray-500 mt-1">Manage UI sound effects across the application.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="fire-gradient text-white border-none font-black uppercase tracking-wider w-full sm:w-auto">
          {saving ? "Saving..." : "Save Settings"}
        </Button>
      </div>

      <div className="space-y-4 pb-12">
        {Object.entries(sounds).length === 0 && (
          <div className="p-8 border border-dashed border-white/10 rounded-xl text-center text-gray-500">
            No sounds registered yet.
          </div>
        )}
        {Object.entries(sounds).map(([key, sound]) => (
          <div key={key} className="flex flex-col sm:flex-row sm:items-center gap-4 sm:gap-6 p-4 rounded-xl border border-white/10 bg-[#0a0a0a] shadow-lg">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white/5 text-gray-400">
                <Volume2 className="h-5 w-5" />
              </div>
              <div className="flex-1 min-w-0 sm:hidden">
                <p className="text-sm font-bold text-white capitalize">{key.replace(/_/g, ' ')}</p>
              </div>
            </div>
            
            <div className="hidden sm:block flex-1 min-w-0">
              <p className="text-sm font-bold text-white capitalize">{key.replace(/_/g, ' ')}</p>
              <input
                value={sound.url ?? ""}
                onChange={(event) => updateSound(key, { url: event.target.value })}
                placeholder="Paste an uploaded audio file URL"
                className="mt-1 w-full bg-transparent text-[10px] text-gray-400 font-mono outline-none placeholder:text-gray-700"
              />
            </div>
            
            <div className="flex items-center gap-6 justify-between sm:justify-end w-full sm:w-auto mt-2 sm:mt-0">
              <div className="flex flex-col items-start sm:items-center gap-2 w-full sm:w-32">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Vol ({sound.volume})</span>
                <input 
                  type="range" 
                  min="0" max="1" step="0.1" 
                  value={sound.volume}
                  onChange={(e) => updateSound(key, { volume: parseFloat(e.target.value) })}
                  className="w-full accent-primary"
                />
              </div>
              <div className="flex flex-col items-center gap-2 shrink-0">
                <span className="text-[10px] text-gray-500 uppercase font-bold">Active</span>
                <Switch 
                  checked={sound.enabled} 
                  onCheckedChange={(c) => updateSound(key, { enabled: c })}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}
