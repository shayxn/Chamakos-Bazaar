import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Check, X, Trash2, Users, ChevronUp, Truck, Tag, Sparkles, Zap, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

interface Member {
  id: number;
  customer_id: number | null;
  customer_name: string;
  customer_email: string | null;
  customer_phone: string | null;
  status: "pending" | "active" | "inactive";
  activated_at: string | null;
  notes: string | null;
  created_at: string;
}

interface FpSettings {
  fp_plus_price: string;
  fp_plus_launched: string;
  fp_plus_free_delivery: string;
  fp_plus_order_discount: string;
  fp_plus_exclusive_deals: string;
  fp_plus_early_access: string;
}

const DEFAULT_SETTINGS: FpSettings = {
  fp_plus_price: "30",
  fp_plus_launched: "false",
  fp_plus_free_delivery: "true",
  fp_plus_order_discount: "5",
  fp_plus_exclusive_deals: "true",
  fp_plus_early_access: "true",
};

const STATUS_STYLE = {
  active:   { label: "Active",   bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  text: "#22c55e" },
  pending:  { label: "Pending",  bg: "rgba(234,179,8,0.15)",  border: "rgba(234,179,8,0.4)",  text: "#eab308" },
  inactive: { label: "Inactive", bg: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)", text: "#888" },
};

function fmtDate(s: string | null) {
  if (!s) return "—";
  return new Date(s).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "numeric" });
}

function Toggle({ on, onToggle, disabled }: { on: boolean; onToggle: () => void; disabled?: boolean }) {
  return (
    <button
      type="button" onClick={onToggle} disabled={disabled}
      className={`relative w-11 h-6 rounded-full transition-all duration-300 shrink-0 ${on ? "bg-green-500" : "bg-white/10 border border-white/20"} disabled:opacity-40`}
    >
      <motion.div
        animate={{ x: on ? 22 : 2 }}
        transition={{ type: "spring", stiffness: 500, damping: 30 }}
        className="absolute top-1 w-4 h-4 rounded-full bg-white shadow"
      />
    </button>
  );
}

export default function AdminFirstPickPlus() {
  const { toast } = useToast();
  const [members, setMembers] = useState<Member[]>([]);
  const [settings, setSettings] = useState<FpSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [priceInput, setPriceInput] = useState("30");
  const [discountInput, setDiscountInput] = useState("5");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMember, setNewMember] = useState({ customer_name: "", customer_email: "", customer_phone: "", notes: "" });
  const [addingMember, setAddingMember] = useState(false);
  const [actionId, setActionId] = useState<number | null>(null);
  const mounted = useRef(true);

  useEffect(() => { return () => { mounted.current = false; }; }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [sRes, mRes] = await Promise.all([
        fetch(`${BASE}/api/firstpick-plus/settings`, { credentials: "include" }),
        fetch(`${BASE}/api/firstpick-plus/members`, { credentials: "include" }),
      ]);
      if (!mounted.current) return;
      const s: FpSettings = await sRes.json();
      const m: Member[] = await mRes.json();
      const merged = { ...DEFAULT_SETTINGS, ...s };
      setSettings(merged);
      setPriceInput(merged.fp_plus_price);
      setDiscountInput(merged.fp_plus_order_discount);
      setMembers(Array.isArray(m) ? m : []);
    } catch {
      if (mounted.current) toast({ title: "Failed to load data", variant: "destructive" });
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadAll(); }, [loadAll]);

  async function saveSetting(key: string, value: string) {
    setSavingKey(key);
    try {
      const patch = { [key]: value };
      const res = await fetch(`${BASE}/api/firstpick-plus/settings`, {
        method: "PUT", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (!res.ok) throw new Error();
      if (mounted.current) setSettings((s) => ({ ...s, ...patch }));
      toast({ title: "Saved ✓" });
    } catch {
      toast({ title: "Failed to save", variant: "destructive" });
    } finally {
      if (mounted.current) setSavingKey(null);
    }
  }

  async function toggleBool(key: keyof FpSettings) {
    const next = settings[key] === "true" ? "false" : "true";
    await saveSetting(key, next);
  }

  async function addMember() {
    if (!newMember.customer_name.trim()) {
      toast({ title: "Name is required", variant: "destructive" }); return;
    }
    setAddingMember(true);
    try {
      const res = await fetch(`${BASE}/api/firstpick-plus/members`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newMember),
      });
      if (!res.ok) throw new Error();
      toast({ title: "Member added ✓" });
      setNewMember({ customer_name: "", customer_email: "", customer_phone: "", notes: "" });
      setShowAddForm(false);
      await loadAll();
    } catch {
      toast({ title: "Failed to add member", variant: "destructive" });
    } finally {
      if (mounted.current) setAddingMember(false);
    }
  }

  async function setStatus(id: number, action: "activate" | "deactivate") {
    setActionId(id);
    try {
      const res = await fetch(`${BASE}/api/firstpick-plus/members/${id}/${action}`, {
        method: "POST", credentials: "include",
      });
      if (!res.ok) throw new Error();
      toast({ title: action === "activate" ? "Member activated ✓" : "Member deactivated" });
      setMembers((prev) => prev.map((m) =>
        m.id === id ? { ...m, status: action === "activate" ? "active" : "inactive" } : m
      ));
    } catch {
      toast({ title: "Action failed", variant: "destructive" });
    } finally {
      if (mounted.current) setActionId(null);
    }
  }

  async function deleteMember(id: number) {
    if (!confirm("Remove this member permanently?")) return;
    setActionId(id);
    try {
      await fetch(`${BASE}/api/firstpick-plus/members/${id}`, { method: "DELETE", credentials: "include" });
      toast({ title: "Member removed" });
      setMembers((prev) => prev.filter((m) => m.id !== id));
    } catch {
      toast({ title: "Delete failed", variant: "destructive" });
    } finally {
      if (mounted.current) setActionId(null);
    }
  }

  const total   = members.length;
  const active  = members.filter((m) => m.status === "active").length;
  const pending = members.filter((m) => m.status === "pending").length;
  const launched = settings.fp_plus_launched === "true";

  return (
    <div className="min-h-screen p-4 md:p-8 space-y-6 max-w-5xl mx-auto">

      {/* ── Header with logo ── */}
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, ease: EASE }}>
        <div className="flex items-center gap-4 mb-1">
          <img
            src={`${BASE}/firstpick-plus-logo.png`}
            alt="FirstPick+"
            className="h-12 w-auto object-contain"
            style={{ filter: "drop-shadow(0 0 16px rgba(255,102,0,0.45))" }}
          />
        </div>
        <p className="text-sm text-muted-foreground mt-1">Manage membership, benefits, pricing, and member access.</p>
      </motion.div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Members", value: total,   color: "#ff6600" },
          { label: "Active",        value: active,  color: "#22c55e" },
          { label: "Pending",       value: pending, color: "#eab308" },
        ].map(({ label, value, color }, i) => (
          <motion.div
            key={label}
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 + i * 0.07, duration: 0.35, ease: EASE }}
            className="glass rounded-xl p-4 text-center"
          >
            <p className="font-mono text-3xl font-black" style={{ color }}>{value}</p>
            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mt-1">{label}</p>
          </motion.div>
        ))}
      </div>

      {/* ── Settings & Benefits ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22, duration: 0.35, ease: EASE }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-white/8">
          <h2 className="font-black uppercase tracking-widest text-xs text-muted-foreground">Settings & Benefits</h2>
        </div>
        <div className="p-6 space-y-6">

          {/* Launch + Price row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {/* Launch toggle */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Visibility</p>
              <div className="flex items-center gap-3">
                <Toggle on={launched} onToggle={() => toggleBool("fp_plus_launched")} disabled={savingKey === "fp_plus_launched"} />
                <span className={`text-sm font-bold ${launched ? "text-green-400" : "text-muted-foreground"}`}>
                  {launched ? "Launched — visible to customers" : "Hidden — not yet visible"}
                </span>
              </div>
            </div>

            {/* Price */}
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">Monthly Price (AED)</p>
              <div className="flex gap-2">
                <Input
                  type="number" min="1" value={priceInput}
                  onChange={(e) => setPriceInput(e.target.value)}
                  className="glass-input flex-1"
                />
                <Button
                  onClick={() => saveSetting("fp_plus_price", priceInput)}
                  disabled={!!savingKey || priceInput === settings.fp_plus_price}
                  size="sm"
                  className="font-black uppercase tracking-wider shrink-0"
                  style={{ background: "linear-gradient(135deg, #ff6600, #ffcc00)" }}
                >
                  <Save className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Benefits divider */}
          <div className="border-t border-white/8 pt-5">
            <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground mb-4">Member Benefits</p>
            <div className="space-y-4">

              {/* Free standard delivery */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/6">
                <Toggle
                  on={settings.fp_plus_free_delivery !== "false"}
                  onToggle={() => toggleBool("fp_plus_free_delivery")}
                  disabled={!!savingKey}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Truck className="h-3.5 w-3.5 text-green-400 shrink-0" />
                    <p className="font-bold text-sm">Free Standard Delivery</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Standard delivery is charged to AED 0 at checkout for active members.</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${
                  settings.fp_plus_free_delivery !== "false"
                    ? "text-green-400 bg-green-400/15 border border-green-400/30"
                    : "text-muted-foreground bg-white/5 border border-white/10"
                }`}>
                  {settings.fp_plus_free_delivery !== "false" ? "ON" : "OFF"}
                </span>
              </div>

              {/* Order discount */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/6">
                <div className="w-11 shrink-0" /> {/* spacer aligned with toggle */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <Tag className="h-3.5 w-3.5 text-primary shrink-0" />
                    <p className="font-bold text-sm">Order Discount (AED)</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">Discount subtracted from every order total. Set to 0 to disable.</p>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-muted-foreground font-bold">AED</span>
                    <Input
                      type="number" min="0" step="1" value={discountInput}
                      onChange={(e) => setDiscountInput(e.target.value)}
                      className="glass-input w-24 h-8 text-sm"
                    />
                    <Button
                      onClick={() => saveSetting("fp_plus_order_discount", discountInput)}
                      disabled={!!savingKey || discountInput === settings.fp_plus_order_discount}
                      size="sm" className="h-8 font-black uppercase text-xs gap-1"
                      style={{ background: "linear-gradient(135deg, #ff6600, #ffcc00)" }}
                    >
                      <Save className="h-3 w-3" /> Save
                    </Button>
                    {parseFloat(discountInput || "0") > 0 ? (
                      <span className="text-xs font-bold text-primary">−AED {discountInput} per order</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Disabled</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Exclusive deals */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/6">
                <Toggle
                  on={settings.fp_plus_exclusive_deals !== "false"}
                  onToggle={() => toggleBool("fp_plus_exclusive_deals")}
                  disabled={!!savingKey}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Sparkles className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                    <p className="font-bold text-sm">Exclusive Member Deals</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Show "Exclusive Deals" benefit card on the membership page.</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${
                  settings.fp_plus_exclusive_deals !== "false"
                    ? "text-purple-400 bg-purple-400/15 border border-purple-400/30"
                    : "text-muted-foreground bg-white/5 border border-white/10"
                }`}>
                  {settings.fp_plus_exclusive_deals !== "false" ? "ON" : "OFF"}
                </span>
              </div>

              {/* Early access */}
              <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.03] border border-white/6">
                <Toggle
                  on={settings.fp_plus_early_access !== "false"}
                  onToggle={() => toggleBool("fp_plus_early_access")}
                  disabled={!!savingKey}
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <Zap className="h-3.5 w-3.5 text-yellow-400 shrink-0" />
                    <p className="font-bold text-sm">Early Access to Drops</p>
                  </div>
                  <p className="text-xs text-muted-foreground">Show "Early Access" benefit card on the membership page.</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-1 rounded-full shrink-0 ${
                  settings.fp_plus_early_access !== "false"
                    ? "text-yellow-400 bg-yellow-400/15 border border-yellow-400/30"
                    : "text-muted-foreground bg-white/5 border border-white/10"
                }`}>
                  {settings.fp_plus_early_access !== "false" ? "ON" : "OFF"}
                </span>
              </div>

            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Members table ── */}
      <motion.div
        initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.35, ease: EASE }}
        className="glass rounded-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="font-black uppercase tracking-widest text-xs text-muted-foreground">
            Members <span className="text-foreground ml-1 font-mono text-sm">{total}</span>
          </h2>
          <Button
            size="sm" onClick={() => setShowAddForm((v) => !v)}
            className="font-black uppercase tracking-wider text-xs gap-1.5"
            style={{ background: "linear-gradient(135deg, #ff6600, #ffcc00)" }}
          >
            {showAddForm ? <ChevronUp className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
            {showAddForm ? "Close" : "Add Member"}
          </Button>
        </div>

        {/* Add form */}
        <AnimatePresence>
          {showAddForm && (
            <motion.div
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="p-5 border-b border-white/8 space-y-3 bg-white/[0.02]">
                <p className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">New Member</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input placeholder="Full name *" value={newMember.customer_name}
                    onChange={(e) => setNewMember((v) => ({ ...v, customer_name: e.target.value }))}
                    className="glass-input" />
                  <Input placeholder="Phone" value={newMember.customer_phone}
                    onChange={(e) => setNewMember((v) => ({ ...v, customer_phone: e.target.value }))}
                    className="glass-input" />
                  <Input placeholder="Email" value={newMember.customer_email}
                    onChange={(e) => setNewMember((v) => ({ ...v, customer_email: e.target.value }))}
                    className="glass-input" />
                  <Input placeholder="Notes" value={newMember.notes}
                    onChange={(e) => setNewMember((v) => ({ ...v, notes: e.target.value }))}
                    className="glass-input" />
                </div>
                <Button onClick={addMember} disabled={addingMember} size="sm"
                  className="font-black uppercase tracking-wider text-xs gap-1.5"
                  style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", color: "#fff" }}>
                  <Users className="h-3.5 w-3.5" />
                  {addingMember ? "Adding…" : "Add Member"}
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {loading ? (
          <div className="p-12 text-center text-muted-foreground text-sm font-black uppercase tracking-widest animate-pulse">Loading…</div>
        ) : members.length === 0 ? (
          <div className="p-12 text-center space-y-2">
            <img src={`${BASE}/firstpick-plus-logo.png`} alt="" className="h-14 w-auto mx-auto opacity-20" />
            <p className="text-muted-foreground text-sm font-bold mt-3">No members yet.</p>
            <p className="text-muted-foreground/60 text-xs">Members who join via WhatsApp will appear here.</p>
          </div>
        ) : (
          <div className="divide-y divide-white/5">
            {members.map((m, i) => {
              const st = STATUS_STYLE[m.status] ?? STATUS_STYLE.inactive;
              const busy = actionId === m.id;
              return (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04, duration: 0.25, ease: EASE }}
                  className="p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-colors"
                >
                  {/* Avatar */}
                  <div className="w-9 h-9 rounded-full shrink-0 flex items-center justify-center font-black text-sm"
                    style={{ background: "rgba(255,102,0,0.12)", border: "1px solid rgba(255,102,0,0.2)", color: "#ff6600" }}>
                    {m.customer_name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate">{m.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {[m.customer_phone, m.customer_email].filter(Boolean).join(" · ")}
                    </p>
                    {m.notes && <p className="text-[11px] text-muted-foreground/50 italic truncate">{m.notes}</p>}
                  </div>

                  {/* Date */}
                  <div className="hidden sm:block text-right shrink-0">
                    <p className="text-[10px] text-muted-foreground">Joined {fmtDate(m.created_at)}</p>
                    {m.activated_at && <p className="text-[10px] text-green-400">Active {fmtDate(m.activated_at)}</p>}
                  </div>

                  {/* Status badge */}
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0"
                    style={{ background: st.bg, border: `1px solid ${st.border}`, color: st.text }}>
                    {st.label}
                  </span>

                  {/* Actions */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {m.status !== "active" && (
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => setStatus(m.id, "activate")} disabled={busy}
                        title="Activate"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                        style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.25)", color: "#22c55e" }}>
                        <Check className="h-3.5 w-3.5" />
                      </motion.button>
                    )}
                    {m.status === "active" && (
                      <motion.button whileTap={{ scale: 0.9 }}
                        onClick={() => setStatus(m.id, "deactivate")} disabled={busy}
                        title="Deactivate"
                        className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#666" }}>
                        <X className="h-3.5 w-3.5" />
                      </motion.button>
                    )}
                    <motion.button whileTap={{ scale: 0.9 }}
                      onClick={() => deleteMember(m.id)} disabled={busy}
                      title="Remove"
                      className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors disabled:opacity-40"
                      style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.18)", color: "#ef4444" }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </motion.button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
