import { useState, useEffect, useRef } from "react";
import { RefreshCw, CheckCircle, XCircle, Trash2, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type RefundReq = {
  id: number; orderNumber: string; customerName: string; customerEmail: string;
  customerPhone: string | null; reason: string; description: string | null;
  status: string; adminNote: string | null; refundAmount: number | null; createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  approved: "text-green-400 bg-green-500/10 border-green-500/30",
  rejected: "text-red-400 bg-red-500/10 border-red-500/30",
  refunded: "text-blue-400 bg-blue-500/10 border-blue-500/30",
};

const REASON_LABELS: Record<string, string> = {
  wrong_item: "Wrong Item",
  damaged: "Damaged / Defective",
  not_as_described: "Not As Described",
  changed_mind: "Changed Mind",
  other: "Other",
};

export default function AdminRefundRequests() {
  const [requests, setRequests] = useState<RefundReq[]>([]);
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<Record<number, { note: string; amount: string }>>({});
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = () => {
    const controller = new AbortController();
    fetch(`${BASE}/api/refund-requests`, { credentials: "include", signal: controller.signal })
      .then(r => r.json())
      .then(d => { if (mountedRef.current) setRequests(d); })
      .catch(() => {})
      .finally(() => { if (mountedRef.current) setLoading(false); });
    return controller;
  };

  useEffect(() => {
    const ctrl = load();
    return () => ctrl.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const updateStatus = async (id: number, status: string) => {
    const f = forms[id] ?? {};
    await fetch(`${BASE}/api/refund-requests/${id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote: f.note || undefined, refundAmount: f.amount ? Number(f.amount) : undefined }),
    });
    toast({ title: `Request ${status}` });
    load();
  };

  const setForm = (id: number, key: "note" | "amount", val: string) =>
    setForms(f => ({ ...f, [id]: { ...f[id], [key]: val } }));

  const deleteReq = async (id: number) => {
    await fetch(`${BASE}/api/refund-requests/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Deleted" });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
          <RefreshCw className="h-7 w-7 text-primary" /> Return & Refund Requests
        </h1>
        <p className="text-muted-foreground font-mono text-sm">{requests.filter(r => r.status === "pending").length} pending</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <RefreshCw className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">No refund requests yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map(r => (
            <div key={r.id} className="bg-card border border-border rounded-xl p-5">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${STATUS_COLORS[r.status] ?? "text-muted-foreground bg-muted border-border"}`}>
                      {r.status}
                    </span>
                    <span className="font-mono text-xs font-bold text-primary">#{r.orderNumber}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <p className="font-bold">{r.customerName} · {r.customerEmail}</p>
                  {r.customerPhone && <p className="text-sm text-muted-foreground">{r.customerPhone}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteReq(r.id)} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="bg-muted/40 rounded-lg p-3 mb-3">
                <p className="text-xs font-black uppercase tracking-wider text-muted-foreground mb-1">Reason</p>
                <p className="font-bold text-sm">{REASON_LABELS[r.reason] ?? r.reason}</p>
                {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
              </div>
              {r.refundAmount != null && (
                <div className="flex items-center gap-2 mb-3 text-green-400">
                  <DollarSign className="h-4 w-4" />
                  <span className="font-black">AED {r.refundAmount.toFixed(2)} approved</span>
                </div>
              )}
              {r.adminNote && <p className="text-xs text-muted-foreground italic mb-3">Note: {r.adminNote}</p>}
              {r.status === "pending" && (
                <div className="space-y-2 mt-3">
                  <div className="flex gap-2">
                    <input type="text" placeholder="Admin note (optional)..." value={forms[r.id]?.note ?? ""}
                      onChange={e => setForm(r.id, "note", e.target.value)}
                      className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50" />
                    <input type="number" placeholder="Refund AED" value={forms[r.id]?.amount ?? ""}
                      onChange={e => setForm(r.id, "amount", e.target.value)}
                      className="w-28 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50" />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => updateStatus(r.id, "approved")} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                      <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                    </Button>
                    <Button size="sm" onClick={() => updateStatus(r.id, "refunded")} className="text-xs bg-blue-600 hover:bg-blue-700 text-white">
                      <DollarSign className="h-3.5 w-3.5 mr-1" /> Mark Refunded
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, "rejected")} className="text-xs">
                      <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
