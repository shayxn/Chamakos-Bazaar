import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowLeft, Braces, CheckCircle2, Code, FilePlus2, AlertTriangle, PlayCircle, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Page, PageContent, StudioAction } from "./types";

const PAGE_TEMPLATE = `{
  "sections": [
    {
      "id": "hero",
      "type": "hero",
      "label": "NEW CAMPAIGN",
      "elements": [
        { "id": "headline", "type": "heading", "text": "MAKE IT YOURS", "animation": { "preset": "slide-up", "duration": 0.45 } },
        { "id": "copy", "type": "text", "text": "Build this page with FirstPick's safe page definition.", "animation": { "preset": "fade", "duration": 0.45, "delay": 0.1 } },
        { "id": "cta", "type": "button", "text": "SHOP NOW", "href": "/shop" }
      ]
    }
  ]
}`;

const EVENT_TEMPLATE = `{
  "actions": [
    { "type": "show-notification", "message": "Welcome to FirstPick." }
  ]
}`;

type Flow = "choose" | "page" | "event";

function CodePreview({ content }: { content: PageContent | null }) {
  if (!content) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-white/10 bg-black">
      <div className="border-b border-white/10 px-3 py-2 text-[9px] font-black uppercase tracking-widest text-gray-500">Safe definition preview</div>
      <div className="max-h-72 space-y-3 overflow-y-auto p-4">
        {content.sections.map((section) => (
          <section key={section.id} className="rounded-lg border border-white/10 bg-white/[0.025] p-3">
            <p className="mb-2 text-[9px] font-black uppercase tracking-widest text-primary">{section.label || section.type}</p>
            <div className="space-y-2">
              {(section.elements ?? []).map((element) => (
                <div key={element.id} className={element.type === "heading" ? "text-lg font-black text-white" : element.type === "button" ? "inline-flex rounded-full bg-primary px-3 py-1.5 text-[9px] font-black text-black" : "text-xs text-white/60"}>
                  {element.type === "product" ? `Product binding: ${element.productId || "choose a product"}` : element.text || element.label || element.type}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

export function CodeValidator({ isOwner }: { isOwner: boolean }) {
  const [flow, setFlow] = useState<Flow>("choose");
  const [code, setCode] = useState("");
  const [result, setResult] = useState<{valid: boolean, errors: string[], warnings: string[]} | null>(null);
  const [validating, setValidating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [pageType, setPageType] = useState<"store" | "admin">("store");
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [pages, setPages] = useState<Page[]>([]);
  const [targetPageId, setTargetPageId] = useState("");
  const [trigger, setTrigger] = useState<"page-open" | "button-click" | "product-click" | "product-added" | "scroll-to-section" | "element-enters" | "admin-page-open">("page-open");
  const { toast } = useToast();

  useEffect(() => {
    if (flow !== "event") return;
    fetchApi("/api/owner-studio/pages").then(setPages).catch((error) => toast({ title: "Could not load pages", description: error.message, variant: "destructive" }));
  }, [flow, toast]);

  const parsed = useMemo(() => {
    try { return code.trim() ? JSON.parse(code) : null; } catch { return null; }
  }, [code]);
  const pageDefinition = flow === "page" && parsed && Array.isArray(parsed.sections) ? parsed as PageContent : null;

  const begin = (next: Exclude<Flow, "choose">) => {
    setFlow(next);
    setResult(null);
    setCode(next === "page" ? PAGE_TEMPLATE : EVENT_TEMPLATE);
  };

  const handleValidate = async () => {
    if (!code.trim()) return;
    setValidating(true);
    setResult(null);
    try {
      const data = await fetchApi("/api/owner-studio/validate-code", {
        method: "POST",
        body: JSON.stringify({ code })
      });
      setResult(data);
    } catch (err: any) {
      toast({ title: "Validation request failed", description: err.message, variant: "destructive" });
    } finally {
      setValidating(false);
    }
  };

  const validateBeforePublish = async () => {
    const data = await fetchApi("/api/owner-studio/validate-code", { method: "POST", body: JSON.stringify({ code }) });
    setResult(data);
    if (!data.valid) throw new Error("Fix the validation errors before publishing.");
    if (!parsed || typeof parsed !== "object") throw new Error("Enter a valid JSON FirstPick definition.");
    return parsed as Record<string, unknown>;
  };

  const submitPage = async () => {
    if (!title.trim() || !slug.trim()) throw new Error("Add a page name and URL before publishing.");
    if (!pageDefinition) throw new Error("A page definition needs a sections array.");
    const definition = await validateBeforePublish();
    const page = await fetchApi("/api/owner-studio/pages", {
      method: "POST",
      body: JSON.stringify({ title: title.trim(), slug: slug.trim(), pageType }),
    }) as Page;
    const updated = await fetchApi(`/api/owner-studio/pages/${page.id}`, {
      method: "PATCH",
      body: JSON.stringify({ content: definition, version: page.version }),
    }) as Page;
    if (isOwner) await fetchApi(`/api/owner-studio/pages/${page.id}/publish`, { method: "POST" });
    toast({
      title: isOwner ? "Page published" : "Draft created",
      description: isOwner ? `/${updated.slug} is now live.` : "An Owner can review and publish this draft.",
    });
    setFlow("choose");
    setCode("");
    setTitle("");
    setSlug("");
  };

  const submitEvent = async () => {
    const target = pages.find((page) => String(page.id) === targetPageId);
    if (!target) throw new Error("Choose the page that should receive this event.");
    const definition = await validateBeforePublish();
    const actions = definition.actions;
    if (!Array.isArray(actions) || !actions.length) throw new Error("An event definition needs a non-empty actions array.");
    const current = await fetchApi(`/api/owner-studio/pages/${target.id}`) as Page;
    const event = {
      id: `event-${Date.now()}`,
      trigger,
      enabled: true,
      actions: actions as StudioAction[],
    };
    await fetchApi(`/api/owner-studio/pages/${target.id}`, {
      method: "PATCH",
      body: JSON.stringify({ content: { ...current.content, events: [...(current.content.events ?? []), event] }, version: current.version }),
    });
    if (isOwner) await fetchApi(`/api/owner-studio/pages/${target.id}/publish`, { method: "POST" });
    toast({ title: isOwner ? "Event published" : "Event saved to draft", description: "It uses only safe FirstPick actions." });
    setFlow("choose");
    setCode("");
  };

  const handleSubmit = async () => {
    try {
      setPublishing(true);
      if (flow === "page") await submitPage();
      if (flow === "event") await submitEvent();
    } catch (error) {
      toast({ title: "Could not publish", description: error instanceof Error ? error.message : "Check the definition and try again.", variant: "destructive" });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="p-4 sm:p-8 max-w-5xl mx-auto w-full h-full flex flex-col absolute inset-0">
      <div className="shrink-0 mb-4 sm:mb-6">
        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wide text-white flex items-center gap-3">
          <Code className="h-6 w-6 text-primary shrink-0" /> Add With Coding
        </h2>
        <p className="text-xs text-gray-500 mt-1">Create pages and events with a safe FirstPick definition—no unrestricted scripts run in your store.</p>
      </div>

      {flow === "choose" ? (
        <div className="grid flex-1 place-content-center gap-4 sm:grid-cols-2 sm:gap-6">
          <button onClick={() => begin("page")} className="group w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br from-primary/15 to-transparent p-7 text-left transition-all hover:-translate-y-1 hover:border-primary/60 hover:bg-primary/10">
            <FilePlus2 className="mb-7 h-8 w-8 text-primary transition-transform group-hover:scale-110" />
            <p className="text-lg font-black uppercase tracking-tight text-white">Make New Page</p>
            <p className="mt-2 text-sm leading-6 text-white/55">Choose Store or Admin, add a name and URL, then preview a safe page definition.</p>
          </button>
          <button onClick={() => begin("event")} className="group w-full max-w-sm rounded-2xl border border-white/10 bg-gradient-to-br from-orange-500/10 to-transparent p-7 text-left transition-all hover:-translate-y-1 hover:border-orange-400/60 hover:bg-orange-400/5">
            <Zap className="mb-7 h-8 w-8 text-orange-300 transition-transform group-hover:scale-110" />
            <p className="text-lg font-black uppercase tracking-tight text-white">Make New Event</p>
            <p className="mt-2 text-sm leading-6 text-white/55">Attach a page-open or interaction event using only the approved FirstPick action set.</p>
          </button>
        </div>
      ) : (
      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 flex-1 min-h-0 pb-4">
        <div className="flex-1 flex flex-col border border-white/10 rounded-xl overflow-hidden bg-black shadow-xl min-h-[300px]">
          <div className="min-h-10 border-b border-white/10 bg-[#0a0a0a] flex items-center justify-between gap-3 px-4 py-2 shrink-0">
            <button onClick={() => setFlow("choose")} className="inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-wider text-gray-500 hover:text-white"><ArrowLeft className="h-3.5 w-3.5" /> Back</button>
            <p className="text-[10px] font-mono text-gray-500">{flow === "page" ? "FirstPick Page Definition" : "FirstPick Event Definition"}</p>
          </div>
          <textarea
            value={code}
            onChange={e => setCode(e.target.value)}
            className="flex-1 p-4 bg-transparent outline-none text-sm font-mono text-gray-300 resize-none custom-scrollbar"
            placeholder={flow === "page" ? "Paste a FirstPick page definition..." : "Paste a FirstPick event definition..."}
            spellCheck={false}
          />
        </div>

        <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4 overflow-y-auto custom-scrollbar">
          <Button 
            onClick={handleValidate} 
            disabled={validating || !code.trim()}
            className="w-full h-12 text-sm font-black uppercase tracking-widest fire-gradient border-none shrink-0"
          >
            <PlayCircle className="mr-2 h-4 w-4" /> {validating ? "Checking..." : "Run Preview"}
          </Button>
          {flow === "page" && (
            <>
              <div className="rounded-xl border border-white/10 bg-black p-4 space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Where should this page live?</p>
                <div className="grid grid-cols-2 gap-2">
                  {(["store", "admin"] as const).map((value) => <button key={value} onClick={() => setPageType(value)} className={`rounded-lg border px-3 py-2 text-[10px] font-black uppercase ${pageType === value ? "border-primary/60 bg-primary/10 text-primary" : "border-white/10 text-gray-500"}`}>{value}</button>)}
                </div>
                <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Page name" className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-xs text-white outline-none focus:border-primary/60" />
                <input value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="Page URL, e.g. gaming" className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-xs text-white outline-none focus:border-primary/60" />
              </div>
              <CodePreview content={pageDefinition} />
            </>
          )}
          {flow === "event" && (
            <div className="rounded-xl border border-white/10 bg-black p-4 space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Where should this event work?</p>
              <select value={targetPageId} onChange={(event) => setTargetPageId(event.target.value)} className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-xs text-white outline-none focus:border-primary/60">
                <option value="">Choose page</option>
                {pages.map((page) => <option key={page.id} value={page.id}>{page.pageType === "admin" ? "Admin" : "Store"} · {page.title}</option>)}
              </select>
              <select value={trigger} onChange={(event) => setTrigger(event.target.value as typeof trigger)} className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2 text-xs text-white outline-none focus:border-primary/60">
                <option value="page-open">Page opens</option>
                <option value="button-click">Button clicked</option>
                <option value="product-click">Product clicked</option>
                <option value="product-added">Product added to cart</option>
                <option value="scroll-to-section">Scroll to section</option>
                <option value="element-enters">Element enters screen</option>
                <option value="admin-page-open">Admin page opens</option>
              </select>
            </div>
          )}
          <Button onClick={handleSubmit} disabled={publishing || !result?.valid} className="w-full min-h-12 text-sm font-black uppercase tracking-widest bg-white text-black hover:bg-gray-200 border-none shrink-0">
            <Sparkles className="mr-2 h-4 w-4" /> {publishing ? "Publishing..." : isOwner ? "Submit & Publish" : "Save Draft"}
          </Button>

          {result && (
            <div className={`p-4 rounded-xl border shrink-0 ${result.valid ? "border-green-500/30 bg-green-500/5" : "border-red-500/30 bg-red-500/5"}`}>
              <div className="flex items-center gap-2 mb-4">
                {result.valid ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                )}
                <span className={`text-sm font-black uppercase ${result.valid ? "text-green-500" : "text-red-500"}`}>
                  {result.valid ? "Passes Static Safety Checks" : "Unsafe Code Detected"}
                </span>
              </div>

              {result.errors.length > 0 && (
                <div className="mb-4">
                  <p className="text-[10px] font-bold text-red-400 uppercase tracking-widest mb-1">Errors ({result.errors.length})</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.errors.map((e, i) => <li key={i} className="text-xs text-gray-300 font-mono break-words">{e}</li>)}
                  </ul>
                </div>
              )}

              {result.warnings.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-yellow-400 uppercase tracking-widest mb-1">Warnings ({result.warnings.length})</p>
                  <ul className="list-disc pl-4 space-y-1">
                    {result.warnings.map((w, i) => <li key={i} className="text-xs text-gray-300 font-mono break-words">{w}</li>)}
                  </ul>
                </div>
              )}
            </div>
          )}

          <div className="mt-auto p-4 rounded-xl border border-white/5 bg-white/5 shrink-0">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Safety Rules</p>
            <ul className="text-[10px] text-gray-500 space-y-2 leading-relaxed">
              <li>Only JSON page layouts and approved event actions are accepted.</li>
              <li>No scripts, browser storage, requests, credentials, or tokens.</li>
              <li>Pages are saved as drafts before an Owner publishes them.</li>
            </ul>
          </div>
        </div>
      </div>
      )}
    </motion.div>
  );
}
