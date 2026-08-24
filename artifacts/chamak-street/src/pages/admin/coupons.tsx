import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Tag, ToggleLeft, ToggleRight, X, Percent, DollarSign, Clock, CheckCircle2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

type Coupon = {
  id: number; code: string; description: string | null;
  discountType: "percent" | "fixed";
  discountValue: number; minOrderAmount: number;
  usageLimit: number | null; usedCount: number;
  expiresAt: string | null; isActive: boolean; createdAt: string;
};

const EMPTY: Omit<Coupon, "id" | "usedCount" | "createdAt"> = {
  code: "", description: "", discountType: "percent", discountValue: 10,
  minOrderAmount: 0, usageLimit: null, expiresAt: null, isActive: true,
};

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button type="button" onClick={() => onChange(!checked)}
      className={`relative inline-flex w-10 h-5 rounded-full transition-colors ${checked ? "bg-primary" : "bg-muted"}`}>
      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? "translate-x-5" : "translate-x-0.5"}`} />
    </button>
  );
}

function CouponModal({ coupon, onSave, onClose }: {
  coupon: Partial<Coupon> | null; onSave: () => void; onClose: () => void;
}) {
  const { toast } = useToast();
  const isNew = !coupon?.id;
  const [form, setForm] = useState<typeof EMPTY>(coupon?.id ? {
    code: coupon.code ?? "", description: coupon.description ?? "",
    discountType: coupon.discountType ?? "percent", discountValue: coupon.discountValue ?? 10,
    minOrderAmount: coupon.minOrderAmount ?? 0, usageLimit: coupon.usageLimit ?? null,
    expiresAt: coupon.expiresAt ? coupon.expiresAt.slice(0, 10) : null, isActive: coupon.isActive ?? true,
  } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const set = (k: keyof typeof EMPTY, v: any) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.code.trim()) { toast({ title: "Code is required", variant: "destructive" }); return; }
    setSaving(true);
    try {
      const url = coupon?.id ? `${BASE}/api/coupons/${coupon.id}` : `${BASE}/api/coupons`;
      const res = await fetch(url, {
        method: coupon?.id ? "PATCH" : "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, code: form.code.toUpperCase().trim() }),
      });
      if (!res.ok) { const d = await res.json() as any; throw new Error(d.error ?? "Save failed"); }
      toast({ title: `Coupon ${isNew ? "created" : "updated"}!` });
      onSave();
    } catch (err) {
      toast({ title: err instanceof Error ? err.message : "Save failed", variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94 }}
        className="w-full max-w-lg rounded-2xl p-6 space-y-5 overflow-y-auto max-h-[90vh]"
        style={{ background: "rgba(12,12,12,0.97)", border: "1px solid rgba(255,102,0,0.2)" }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-black uppercase tracking-widest text-lg">{isNew ? "Create Coupon" : "Edit Coupon"}</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="label-xs mb-1.5 block">Coupon Code *</label>
            <Input value={form.code} onChange={e => set("code", e.target.value.toUpperCase())}
              placeholder="e.g. SUMMER20" className="font-mono font-black tracking-widest" />
          </div>
          <div>
            <label className="label-xs mb-1.5 block">Description (optional)</label>
            <Input value={form.description ?? ""} onChange={e => set("description", e.target.value)} placeholder="e.g. Summer sale discount" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs mb-1.5 block">Discount Type</label>
              <div className="flex gap-2">
                {(["percent", "fixed"] as const).map(t => (
                  <button key={t} type="button" onClick={() => set("discountType", t)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg border text-xs font-black uppercase tracking-wider transition-all ${
                      form.discountType === t ? "border-primary glass-orange text-primary" : "border-border/40 text-muted-foreground hover:border-primary/40"
                    }`}>
                    {t === "percent" ? <Percent className="h-3 w-3" /> : <DollarSign className="h-3 w-3" />}
                    {t === "percent" ? "%" : "AED"}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="label-xs mb-1.5 block">Discount Value</label>
              <div className="flex items-center gap-1.5 glass-sm border border-border/40 rounded-lg px-3 h-9">
                <input type="number" min="0" step="0.01" value={form.discountValue}
                  onChange={e => set("discountValue", Number(e.target.value))}
                  className="flex-1 bg-transparent outline-none text-sm font-mono font-black" />
                <span className="text-muted-foreground text-xs font-bold">{form.discountType === "percent" ? "%" : "AED"}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label-xs mb-1.5 block">Min Order (AED)</label>
              <Input type="number" min="0" value={form.minOrderAmount}
                onChange={e => set("minOrderAmount", Number(e.target.value))} placeholder="0 = no minimum" />
            </div>
            <div>
              <label className="label-xs mb-1.5 block">Usage Limit</label>
              <Input type="number" min="1" value={form.usageLimit ?? ""}
                onChange={e => set("usageLimit", e.target.value ? Number(e.target.value) : null)}
                placeholder="Unlimited" />
            </div>
          </div>

          <div>
            <label className="label-xs mb-1.5 block">Expiry Date (optional)</label>
            <Input type="date" value={form.expiresAt ?? ""}
              onChange={e => set("expiresAt", e.target.value || null)} />
          </div>

          <div className="flex items-center justify-between py-2 border-t border-border/30">
            <div>
              <p className="text-sm font-bold">Active</p>
              <p className="text-xs text-muted-foreground">Allow customers to use this coupon</p>
            </div>
            <Toggle checked={form.isActive} onChange={v => set("isActive", v)} />
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1 font-bold uppercase tracking-wider">Cancel</Button>
          <Button onClick={handleSave} disabled={saving} className="flex-1 fire-gradient border-none font-black uppercase tracking-wider">
            {saving ? "Saving…" : isNew ? "Create Coupon" : "Save Changes"}
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function AdminCoupons() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalCoupon, setModalCoupon] = useState<Partial<Coupon> | null | false>(false);
  const [deleting, setDeleting] = useState<number | null>(null);
  const { toast } = useToast();

  const fetchCoupons = useCallback(async () => {
    try {
      const res = await fetch(`${BASE}/api/coupons`, { credentials: "include" });
      if (res.ok) setCoupons(await res.json() as Coupon[]);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { fetchCoupons(); }, [fetchCoupons]);

  const deleteCoupon = async (id: number) => {
    if (!confirm("Delete this coupon? This cannot be undone.")) return;
    setDeleting(id);
    try {
      await fetch(`${BASE}/api/coupons/${id}`, { method: "DELETE", credentials: "include" });
      setCoupons(prev => prev.filter(c => c.id !== id));
      toast({ title: "Coupon deleted" });
    } catch { toast({ title: "Failed to delete", variant: "destructive" }); }
    setDeleting(null);
  };

  const toggleActive = async (coupon: Coupon) => {
    const res = await fetch(`${BASE}/api/coupons/${coupon.id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !coupon.isActive }),
    });
    if (res.ok) setCoupons(prev => prev.map(c => c.id === coupon.id ? { ...c, isActive: !c.isActive } : c));
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("en-AE", { dateStyle: "medium" });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tighter flex items-center gap-2">
            <Tag className="h-5 w-5 text-primary" /> Coupon Codes
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Create and manage discount codes for your customers</p>
        </div>
        <Button onClick={() => setModalCoupon({})} className="fire-gradient border-none font-black uppercase tracking-wider gap-2">
          <Plus className="h-4 w-4" /> New Coupon
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : coupons.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-center py-20 space-y-3 border border-dashed border-border/40 rounded-2xl">
          <Tag className="h-12 w-12 mx-auto text-muted-foreground/30" />
          <p className="font-black uppercase tracking-widest text-muted-foreground">No coupons yet</p>
          <Button onClick={() => setModalCoupon({})} variant="outline" className="gap-2 font-bold uppercase tracking-wider">
            <Plus className="h-4 w-4" /> Create Your First Coupon
          </Button>
        </motion.div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-border/40">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "rgba(255,255,255,0.03)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
                {["Code", "Discount", "Min Order", "Used / Limit", "Expires", "Status", ""].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-black uppercase tracking-widest text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              <AnimatePresence>
                {coupons.map((c, i) => (
                  <motion.tr key={c.id}
                    initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ delay: i * 0.03, ease: EASE }}
                    style={{ borderBottom: "1px solid rgba(255,255,255,0.05)" }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <code className="font-mono font-black text-primary tracking-widest text-sm">{c.code}</code>
                        {c.isActive && <CheckCircle2 className="h-3 w-3 text-green-400 shrink-0" />}
                      </div>
                      {c.description && <p className="text-xs text-muted-foreground mt-0.5">{c.description}</p>}
                    </td>
                    <td className="px-4 py-3 font-mono font-bold">
                      {c.discountType === "percent" ? `${c.discountValue}%` : `AED ${c.discountValue.toFixed(0)}`}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">
                      {c.minOrderAmount > 0 ? `AED ${c.minOrderAmount.toFixed(0)}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      {c.usedCount} / {c.usageLimit ?? "∞"}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground flex items-center gap-1">
                      {c.expiresAt ? (
                        <>
                          <Clock className="h-3 w-3 shrink-0" />
                          {formatDate(c.expiresAt)}
                        </>
                      ) : "No expiry"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Toggle checked={c.isActive} onChange={() => toggleActive(c)} />
                        <span className="text-xs font-bold text-muted-foreground">{c.isActive ? "Active" : "Off"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button onClick={() => setModalCoupon(c)} className="p-1.5 rounded-lg hover:bg-primary/10 text-muted-foreground hover:text-primary transition-colors">
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => deleteCoupon(c.id)} disabled={deleting === c.id}
                          className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </div>
      )}

      <AnimatePresence>
        {modalCoupon !== false && (
          <CouponModal
            coupon={modalCoupon || null}
            onSave={() => { setModalCoupon(false); fetchCoupons(); }}
            onClose={() => setModalCoupon(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
