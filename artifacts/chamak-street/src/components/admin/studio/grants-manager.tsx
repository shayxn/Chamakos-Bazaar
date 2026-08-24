import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Access, Admin } from "./types";

export function GrantsManager({ access }: { access: Access }) {
  const { toast } = useToast();
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [grantedIds, setGrantedIds] = useState<Set<number>>(new Set(access.grantedAdminIds));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchApi("/api/owner-studio/admins")
      .then(data => setAdmins(data))
      .catch(err => toast({ title: "Failed to load admins", description: err.message, variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const toggleGrant = (id: number) => {
    const next = new Set(grantedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setGrantedIds(next);
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await fetchApi("/api/owner-studio/grants", {
        method: "PATCH",
        body: JSON.stringify({ adminIds: Array.from(grantedIds) })
      });
      toast({ title: "Grants updated" });
    } catch (err: any) {
      toast({ title: "Failed to update", description: err.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500 absolute inset-0">Loading admins...</div>;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 sm:p-8 max-w-3xl mx-auto w-full h-full overflow-y-auto absolute inset-0 custom-scrollbar">
       <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-8 gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white flex items-center gap-3">
            <Shield className="h-6 w-6 text-primary shrink-0" /> Access Control
          </h2>
          <p className="text-xs text-gray-500 mt-1">Grant or revoke Owner Studio access for other admins.</p>
        </div>
        <Button onClick={handleSave} disabled={saving} className="bg-white text-black hover:bg-gray-200 border-none font-black uppercase tracking-wider w-full sm:w-auto">
          {saving ? "Saving..." : "Save Grants"}
        </Button>
      </div>

      <div className="grid gap-3 pb-12">
        {admins.map(admin => {
          const isOwner = admin.id === access.ownerId;
          const hasAccess = grantedIds.has(admin.id);
          
          return (
            <div key={admin.id} className="flex items-center justify-between p-4 rounded-xl border border-white/10 bg-[#0a0a0a]">
              <div className="min-w-0 pr-4">
                <p className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                  <span className="truncate">{admin.username}</span>
                  {isOwner && <span className="text-[9px] bg-primary/20 text-primary px-2 py-0.5 rounded-full uppercase tracking-widest font-black shrink-0">Owner</span>}
                </p>
                <p className="text-xs text-gray-500 truncate">{admin?.email}</p>
              </div>
              
              {!isOwner && (
                <div className="shrink-0">
                  <Switch 
                    checked={hasAccess}
                    onCheckedChange={() => toggleGrant(admin.id)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </motion.div>
  );
}
