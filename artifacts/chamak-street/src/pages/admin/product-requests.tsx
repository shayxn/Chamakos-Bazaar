import { useState, useEffect, useRef } from "react";
import { MessageSquarePlus, CheckCircle, XCircle, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Request = {
  id: number; customerName: string; customerEmail: string;
  productName: string; description: string | null; referenceUrl: string | null;
  status: string; adminNote: string | null; createdAt: string;
};

const STATUS_COLORS: Record<string, string> = {
  pending: "text-yellow-400 bg-yellow-500/10 border-yellow-500/30",
  approved: "text-green-400 bg-green-500/10 border-green-500/30",
  rejected: "text-red-400 bg-red-500/10 border-red-500/30",
};

export default function AdminProductRequests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<Record<number, string>>({});
  const { toast } = useToast();
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const load = () => {
    const controller = new AbortController();
    fetch(`${BASE}/api/product-requests`, { credentials: "include", signal: controller.signal })
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
    await fetch(`${BASE}/api/product-requests/${id}`, {
      method: "PATCH", credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, adminNote: note[id] ?? undefined }),
    });
    toast({ title: `Request ${status}` });
    load();
  };

  const deleteReq = async (id: number) => {
    await fetch(`${BASE}/api/product-requests/${id}`, { method: "DELETE", credentials: "include" });
    toast({ title: "Deleted" });
    load();
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2 flex items-center gap-3">
          <MessageSquarePlus className="h-7 w-7 text-primary" /> Product Requests
        </h1>
        <p className="text-muted-foreground font-mono text-sm">Customers requesting products to be added</p>
      </div>

      {requests.length === 0 ? (
        <div className="bg-card border border-border rounded-xl p-16 text-center">
          <MessageSquarePlus className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-30" />
          <p className="text-muted-foreground font-bold uppercase tracking-widest text-sm">No product requests yet</p>
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
                    <span className="text-xs text-muted-foreground">{new Date(r.createdAt).toLocaleDateString()}</span>
                  </div>
                  <h3 className="font-black text-lg">{r.productName}</h3>
                  <p className="text-sm text-muted-foreground">{r.customerName} · {r.customerEmail}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => deleteReq(r.id)} className="text-destructive shrink-0">
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              {r.description && <p className="text-sm text-muted-foreground mb-2 bg-muted/40 rounded-lg p-3">{r.description}</p>}
              {r.referenceUrl && (
                <a href={r.referenceUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-primary hover:underline block mb-2 truncate">
                  🔗 {r.referenceUrl}
                </a>
              )}
              {r.adminNote && <p className="text-xs text-muted-foreground italic mb-2">Note: {r.adminNote}</p>}
              {r.status === "pending" && (
                <div className="flex gap-2 mt-3">
                  <input type="text" placeholder="Optional admin note..." value={note[r.id] ?? ""}
                    onChange={e => setNote(n => ({ ...n, [r.id]: e.target.value }))}
                    className="flex-1 px-3 py-1.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:border-primary/50" />
                  <Button size="sm" onClick={() => updateStatus(r.id, "approved")} className="text-xs bg-green-600 hover:bg-green-700 text-white">
                    <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(r.id, "rejected")} className="text-xs">
                    <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                  </Button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
