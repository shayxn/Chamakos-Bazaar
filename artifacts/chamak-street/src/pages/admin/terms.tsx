import { useEffect, useState } from "react";
import { FileText, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

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
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/content/terms", { credentials: "include" })
      .then((response) => response.json())
      .then((page: ContentPage) => {
        setTitle(page.title);
        setContent(page.content);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const response = await fetch("/api/content/terms", {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, content }),
      });
      if (!response.ok) throw new Error("Save failed");
      setMessage("Policy saved.");
    } catch {
      setMessage("Policy could not be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div>Loading policy...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black uppercase tracking-tighter mb-2">Terms & Policy</h1>
        <p className="text-muted-foreground font-mono text-sm">Edit the public policy page shown at checkout/footer</p>
      </div>

      <form onSubmit={handleSave} className="bg-card border border-border rounded-lg p-6 space-y-5">
        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            Page Title
          </label>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} className="bg-background" />
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Policy Content</label>
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            className="min-h-[520px] bg-background font-mono text-sm leading-6"
            placeholder="Use ## for section headings and - for bullet points."
          />
        </div>

        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">{message}</p>
          <Button type="submit" disabled={saving} className="font-bold uppercase tracking-wider bg-primary hover:bg-primary/90">
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save Policy"}
          </Button>
        </div>
      </form>
    </div>
  );
}
