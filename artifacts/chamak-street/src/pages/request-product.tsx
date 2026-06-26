import { useState } from "react";
import { motion } from "framer-motion";
import { MessageSquarePlus, CheckCircle, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export default function RequestProduct() {
  const [form, setForm] = useState({ customerName: "", customerEmail: "", productName: "", description: "", referenceUrl: "" });
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${BASE}/api/product-requests`, {
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
        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="h-10 w-10 text-primary" />
        </div>
        <h2 className="text-3xl font-black uppercase tracking-tighter mb-3">Request Received</h2>
        <p className="text-muted-foreground mb-8">We'll review your request and let you know if we can source it. Check back soon!</p>
        <Link href="/shop">
          <button className="px-8 py-3 bg-primary text-primary-foreground font-black uppercase tracking-widest text-sm rounded-lg">
            Continue Shopping
          </button>
        </Link>
      </motion.div>
    </div>
  );

  return (
    <div className="min-h-screen py-16 px-4">
      <div className="max-w-lg mx-auto">
        <Link href="/shop">
          <button className="flex items-center gap-2 text-muted-foreground hover:text-foreground font-bold uppercase tracking-wider text-xs mb-8 transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Back to Shop
          </button>
        </Link>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
            <MessageSquarePlus className="h-5 w-5 text-primary" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tighter">Request a Product</h1>
        </div>
        <p className="text-muted-foreground mb-10">Can't find what you're looking for? Tell us and we'll try to source it for you.</p>

        <motion.form initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Your Name *</label>
              <input required value={form.customerName} onChange={e => set("customerName", e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="John Doe" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email *</label>
              <input required type="email" value={form.customerEmail} onChange={e => set("customerEmail", e.target.value)}
                className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="you@example.com" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Product Name *</label>
            <input required value={form.productName} onChange={e => set("productName", e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="Nike Dunk Low Panda, Size 10..." />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Description</label>
            <textarea rows={3} value={form.description} onChange={e => set("description", e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors resize-none" placeholder="Size, color, any specific details..." />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Reference Link (optional)</label>
            <input type="url" value={form.referenceUrl} onChange={e => set("referenceUrl", e.target.value)}
              className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="https://..." />
          </div>

          <button type="submit" disabled={loading}
            className="w-full py-4 font-black uppercase tracking-widest text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
            {loading ? "Sending..." : "Submit Request →"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}
