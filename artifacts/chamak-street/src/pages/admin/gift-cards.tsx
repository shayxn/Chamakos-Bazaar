import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, RefreshCw, ChevronDown, ChevronUp, Shield, ShieldOff, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

interface GiftCard {
  id: number; code: string; claimToken: string | null;
  amount: number; balance: number; status: string;
  forSelf: boolean; purchaserCustomerId: number | null;
  ownerCustomerId: number | null; recipientName: string | null;
  senderName: string | null; message: string | null;
  claimedAt: string | null; createdAt: string;
  purchaserName: string | null; purchaserEmail: string | null;
  ownerName: string | null; ownerEmail: string | null;
  transactions: { id: number; amount_used: number; balance_after: number; description: string; created_at: string }[];
}

const STATUS_COLORS: Record<string, string> = {
  active:   "text-green-400  bg-green-400/10  border-green-400/20",
  pending:  "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  used:     "text-white/30   bg-white/5       border-white/10",
  disabled: "text-red-400    bg-red-400/10    border-red-400/20",
};

export default function AdminGiftCardsPage() {
  const { toast } = useToast();
  const mountedRef = useRef(true);
  const [cards, setCards]       = useState<GiftCard[]>([]);
  const [loading, setLoading]   = useState(true);
  const [filter, setFilter]     = useState<"all" | "active" | "pending" | "used" | "disabled">("all");
  const [query, setQuery]       = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [toggling, setToggling] = useState<number | null>(null);

  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false; }; }, []);

  const fetchCards = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/admin/gift-cards`, { credentials: "include" });
      if (!res.ok) return;
      const data = await res.json();
      if (mountedRef.current) setCards(data);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => { fetchCards(); }, []);

  const toggleStatus = async (card: GiftCard) => {
    const newStatus = card.status === "disabled" ? "active" : "disabled";
    setToggling(card.id);
    try {
      const res = await fetch(`${BASE}/api/admin/gift-cards/${card.id}`, {
        method: "PATCH", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) throw new Error("Failed");
      setCards(prev => prev.map(c => c.id === card.id ? { ...c, status: newStatus } : c));
      toast({ title: `Card ${newStatus === "disabled" ? "disabled" : "re-enabled"}` });
    } catch {
      toast({ title: "Error", variant: "destructive" });
    } finally {
      if (mountedRef.current) setToggling(null);
    }
  };

  const filtered = cards.filter(c => {
    if (filter !== "all" && c.status !== filter) return false;
    if (query) {
      const q = query.toLowerCase();
      return (
        c.code?.toLowerCase().includes(q) ||
        c.purchaserName?.toLowerCase().includes(q) ||
        c.ownerName?.toLowerCase().includes(q) ||
        c.recipientName?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const totalActive   = cards.filter(c => c.status === "active").reduce((s, c) => s + c.balance, 0);
  const totalIssued   = cards.reduce((s, c) => s + c.amount, 0);
  const totalRedeemed = cards.reduce((s, c) => s + (c.amount - c.balance), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Gift className="w-5 h-5 text-primary" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Gift Cards</h1>
          </div>
          <p className="text-white/40 text-sm">Manage digital gift cards, balances, and redemptions</p>
        </div>
        <button onClick={fetchCards} disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-white/15 text-sm font-bold hover:bg-white/5 transition-colors disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Total Issued", value: `AED ${totalIssued.toFixed(0)}`, sub: `${cards.length} cards` },
          { label: "Active Balance", value: `AED ${totalActive.toFixed(0)}`, sub: `${cards.filter(c => c.status === "active").length} active` },
          { label: "Total Redeemed", value: `AED ${totalRedeemed.toFixed(0)}`, sub: "spent so far" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-white/10 p-4"
            style={{ background: "rgba(255,255,255,0.02)" }}>
            <div className="text-xs font-bold uppercase tracking-widest text-white/30 mb-1">{s.label}</div>
            <div className="text-xl font-black text-primary">{s.value}</div>
            <div className="text-xs text-white/30">{s.sub}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-2 items-center flex-wrap">
        <div className="flex gap-1 rounded-xl border border-white/10 p-1" style={{ background: "rgba(255,255,255,0.02)" }}>
          {(["all", "active", "pending", "used", "disabled"] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all ${
                filter === f ? "bg-primary text-white" : "text-white/40 hover:text-white"
              }`}>
              {f}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-40 max-w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30" />
          <Input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Search code / name…"
            className="pl-8 h-9 bg-white/3 border-white/10 text-sm"
          />
        </div>
      </div>

      {/* Cards list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
            className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-white/20">
          <Gift className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="font-bold">No gift cards found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(card => (
            <div key={card.id} className="rounded-xl border border-white/8 overflow-hidden"
              style={{ background: "rgba(255,255,255,0.02)" }}>
              {/* Main row */}
              <div className="flex items-center gap-3 p-4">
                {/* Code */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-sm font-black text-white">{card.code}</span>
                    <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded border ${STATUS_COLORS[card.status] ?? "text-white/30 bg-white/5 border-white/10"}`}>
                      {card.status}
                    </span>
                    <span className="text-[9px] font-bold uppercase text-white/30 border border-white/10 px-2 py-0.5 rounded">
                      {card.forSelf ? "For Me" : "Gift"}
                    </span>
                  </div>
                  <div className="text-xs text-white/30 mt-1">
                    {card.purchaserName ?? "—"} → {card.ownerName ?? card.recipientName ?? (card.forSelf ? card.purchaserName : "Unclaimed")}
                  </div>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  <div className="font-black text-primary">AED {card.balance.toFixed(0)}</div>
                  <div className="text-[10px] text-white/25">of AED {card.amount.toFixed(0)}</div>
                </div>

                {/* Date */}
                <div className="text-[10px] text-white/25 shrink-0 hidden sm:block">
                  {new Date(card.createdAt).toLocaleDateString("en-AE", { day: "2-digit", month: "short", year: "2-digit" })}
                </div>

                {/* Disable/Enable */}
                <button
                  onClick={() => toggleStatus(card)}
                  disabled={toggling === card.id || card.status === "pending" || card.status === "used"}
                  className="shrink-0 p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors disabled:opacity-30"
                  title={card.status === "disabled" ? "Re-enable card" : "Disable card"}>
                  {card.status === "disabled"
                    ? <Shield className="w-4 h-4 text-green-400" />
                    : <ShieldOff className="w-4 h-4 text-red-400" />}
                </button>

                {/* Expand */}
                <button onClick={() => setExpanded(expanded === card.id ? null : card.id)}
                  className="shrink-0 p-2 rounded-lg border border-white/10 hover:border-white/20 transition-colors">
                  {expanded === card.id
                    ? <ChevronUp className="w-4 h-4 text-white/40" />
                    : <ChevronDown className="w-4 h-4 text-white/40" />}
                </button>
              </div>

              {/* Expanded details */}
              <AnimatePresence>
                {expanded === card.id && (
                  <motion.div initial={{ height: 0 }} animate={{ height: "auto" }} exit={{ height: 0 }}
                    className="overflow-hidden border-t border-white/8">
                    <div className="p-4 space-y-3">
                      {/* Info grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                        {[
                          ["Purchaser", `${card.purchaserName ?? "—"} (${card.purchaserEmail ?? "—"})`],
                          ["Owner", `${card.ownerName ?? "—"} (${card.ownerEmail ?? "—"})`],
                          ["Recipient Name", card.recipientName ?? "—"],
                          ["Message", card.message ?? "—"],
                          ["Claimed At", card.claimedAt ? new Date(card.claimedAt).toLocaleString("en-AE") : "Unclaimed"],
                          ["Claim Token", card.claimToken ? card.claimToken.slice(0, 12) + "…" : "N/A"],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <div className="text-white/25 font-bold uppercase tracking-widest mb-0.5">{label}</div>
                            <div className="text-white/60 break-all">{value}</div>
                          </div>
                        ))}
                      </div>

                      {/* Transactions */}
                      {card.transactions?.length > 0 && (
                        <div>
                          <div className="text-xs font-bold uppercase tracking-widest text-white/25 mb-2">Usage History</div>
                          <div className="space-y-1">
                            {card.transactions.map((t: any) => (
                              <div key={t.id} className="flex items-center justify-between text-xs py-1.5 px-3 rounded-lg border border-white/6"
                                style={{ background: "rgba(255,255,255,0.02)" }}>
                                <span className="text-white/40">{t.description} {t.order_id ? `· Order #${t.order_id}` : ""}</span>
                                <span className="text-red-400 font-bold">-AED {Number(t.amount_used).toFixed(2)}</span>
                                <span className="text-white/25">Bal: AED {Number(t.balance_after).toFixed(2)}</span>
                                <span className="text-white/20">{new Date(t.created_at).toLocaleDateString("en-AE")}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {!card.transactions?.length && (
                        <div className="text-xs text-white/20 text-center py-2">No transactions yet</div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
