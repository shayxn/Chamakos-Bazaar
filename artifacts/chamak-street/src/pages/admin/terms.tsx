import { useEffect, useState } from "react";
import { FileText, Save, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type ContentPage = {
  slug: string;
  title: string;
  content: string;
  updatedAt: string | null;
};

export default function AdminTerms() {
  const [title, setTitle] = useState("Terms of Policy");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(`${BASE}/api/content/terms`, { credentials: "include" })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((page: ContentPage) => {
        setTitle(page.title || "Terms of Policy");
        setContent(page.content || "");
      })
      .catch(() => setError("Could not load policy content."))
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const r = await fetch(`${BASE}/api/content/terms`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!r.ok) throw new Error();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Could not save. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex items-center gap-3 py-20 justify-center">
      <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        className="w-5 h-5 rounded-full border-2 border-primary/30 border-t-primary" />
      <span className="text-sm text-muted-foreground font-bold">Loading policy…</span>
    </div>
  );

  return (
    <div className="space-y-8 max-w-3xl">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-1">Terms & Policy</h1>
        <p className="text-muted-foreground text-sm">Edit the public policy page shown at checkout and in the footer</p>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <FileText className="h-3.5 w-3.5 text-primary" /> Page Title
          </label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="bg-background border-border focus-visible:ring-primary h-11"
          />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            Policy Content
          </label>
          <Textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            className="min-h-[520px] bg-background font-mono text-sm leading-6 border-border focus-visible:ring-primary"
            placeholder="Use ## for headings and - for bullet points."
          />
          <p className="text-[10px] text-muted-foreground">
            {content.length} characters · Markdown supported
          </p>
        </div>

        <div className="flex items-center justify-between gap-4 pt-2">
          <AnimatePresence mode="wait">
            {error && (
              <motion.p key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="text-sm text-destructive font-bold">{error}</motion.p>
            )}
            {saved && (
              <motion.p key="ok" initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                className="text-sm text-green-400 font-bold flex items-center gap-1.5">
                <CheckCircle className="h-3.5 w-3.5" /> Saved!
              </motion.p>
            )}
            {!error && !saved && <span />}
          </AnimatePresence>
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button type="submit" disabled={saving}
              className="font-black uppercase tracking-wider fire-gradient border-none px-6">
              <Save className="mr-2 h-4 w-4" />
              {saving ? "Saving…" : "Save Policy"}
            </Button>
          </motion.div>
        </div>
      </form>
    </div>
  );
}
