import { useState } from "react";
import { motion } from "framer-motion";
import { RefreshCw, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

const REASONS = [
  { value: "wrong_item", label: "Wrong item received" },
  { value: "damaged", label: "Damaged or defective" },
  { value: "not_as_described", label: "Not as described" },
  { value: "changed_mind", label: "Changed my mind" },
  { value: "other", label: "Other" },
];

export default function Returns() {
  const [form, setForm] = useState({ orderNumber: "", customerName: "", customerEmail: "", customerPhone: "", reason: "", description: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.reason) { alert("Please select a reason"); return; }
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/refund-requests`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error();
      setDone(true);
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (done) return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="text-center max-w-md">
        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-green-400" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Request Submitted</h2>
        <p className="text-muted-foreground mb-4">We've received your return request. Our team will review it and get back to you within 1–2 business days.</p>
        <p className="text-xs text-muted-foreground mb-8">Order #{form.orderNumber}</p>
        <Link href="/">
          <button className="px-8 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-lg">
            Back to Home
          </button>
        </Link>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider text-xs mb-8 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Home
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-blue-500/10 rounded-full flex items-center justify-center">
            <RefreshCw className="h-5 w-5 text-blue-400" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Returns & Refunds</h1>
        </div>
        <p className="text-muted-foreground mb-4">Submit a return or refund request below. We'll review and get back to you within 1–2 business days.</p>

        <div className="bg-card border border-border rounded-xl p-4 mb-8 text-sm">
          <p className="font-bold uppercase tracking-wider text-xs mb-2 text-muted-foreground">Return Policy</p>
          <ul className="text-muted-foreground space-y-1 text-xs">
            <li>• Returns accepted within 7 days of delivery</li>
            <li>• Item must be unused and in original condition</li>
            <li>• Proof of purchase (order number) required</li>
          </ul>
        </div>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Order Number *</label>
            <input required value={form.orderNumber} onChange={e => set("orderNumber", e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors font-mono" placeholder="CHM-123456" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name *</label>
              <input required value={form.customerName} onChange={e => set("customerName", e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone</label>
              <input value={form.customerPhone} onChange={e => set("customerPhone", e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="+971 50..." />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email *</label>
            <input required type="email" value={form.customerEmail} onChange={e => set("customerEmail", e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="you@example.com" />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Reason *</label>
            <div className="space-y-2">
              {REASONS.map(r => (
                <label key={r.value} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${form.reason === r.value ? "border-primary bg-primary/5" : "border-border hover:border-border/80"}`}>
                  <input type="radio" name="reason" value={r.value} checked={form.reason === r.value} onChange={() => set("reason", r.value)} className="text-primary" />
                  <span className="text-sm font-bold">{r.label}</span>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Additional Details</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors resize-none" placeholder="Please describe the issue in detail..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 font-black uppercase tracking-widest text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Submitting..." : "Submit Return Request →"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
