import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, Monitor, Globe, LockKeyhole, Search, Layers3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { fetchApi } from "./api";
import { Page, Access } from "./types";
import { PageEditor } from "./page-editor";

type SystemPageSeed = { key: string; title: string; route: string; pageType: "store" | "admin"; group: string };
type InventoryItem = { kind: "system"; seed: SystemPageSeed; page?: Page } | { kind: "studio"; page: Page };

const SYSTEM_PAGES: SystemPageSeed[] = [
  { key: "home", title: "Home", route: "/", pageType: "store", group: "Storefront" },
  { key: "shop", title: "Shop", route: "/shop", pageType: "store", group: "Storefront" },
  { key: "basics", title: "FP Basics", route: "/basics", pageType: "store", group: "Storefront" },
  { key: "back-to-school", title: "Back To School", route: "/back-to-school", pageType: "store", group: "Storefront" },
  { key: "product-detail", title: "Product Detail Template", route: "/product/:id", pageType: "store", group: "Storefront" },
  { key: "cart", title: "Cart", route: "/cart", pageType: "store", group: "Customer" },
  { key: "checkout", title: "Checkout", route: "/checkout", pageType: "store", group: "Customer" },
  { key: "order-confirmation", title: "Order Confirmation Template", route: "/order/:id", pageType: "store", group: "Customer" },
  { key: "order-tracking", title: "Track Order", route: "/order-tracking", pageType: "store", group: "Customer" },
  { key: "receipt", title: "Receipt Template", route: "/receipt/:id", pageType: "store", group: "Customer" },
  { key: "account", title: "Account", route: "/account", pageType: "store", group: "Customer" },
  { key: "account-login", title: "Account Login", route: "/account/login", pageType: "store", group: "Customer" },
  { key: "account-register", title: "Account Register", route: "/account/register", pageType: "store", group: "Customer" },
  { key: "returns", title: "Returns", route: "/returns", pageType: "store", group: "Customer" },
  { key: "request-product", title: "Request a Product", route: "/request-product", pageType: "store", group: "Customer" },
  { key: "games", title: "Games", route: "/games", pageType: "store", group: "Storefront" },
  { key: "game-detail", title: "Game Detail Template", route: "/games/:id", pageType: "store", group: "Storefront" },
  { key: "support", title: "Support", route: "/support", pageType: "store", group: "Customer" },
  { key: "wishlist", title: "Wishlist", route: "/wishlist", pageType: "store", group: "Customer" },
  { key: "maintenance", title: "Maintenance", route: "/maintenance", pageType: "store", group: "System" },
  { key: "terms", title: "Terms", route: "/terms", pageType: "store", group: "Legal" },
  { key: "privacy", title: "Privacy", route: "/privacy", pageType: "store", group: "Legal" },
  { key: "shipping", title: "Shipping", route: "/shipping", pageType: "store", group: "Legal" },
  { key: "admin-dashboard", title: "Dashboard", route: "/admin", pageType: "admin", group: "Admin" },
  { key: "admin-products", title: "Products", route: "/admin/products", pageType: "admin", group: "Admin" },
  { key: "admin-basics", title: "FP Basics Catalog", route: "/admin/basics", pageType: "admin", group: "Admin" },
  { key: "admin-orders", title: "Orders", route: "/admin/orders", pageType: "admin", group: "Admin" },
  { key: "admin-categories", title: "Categories", route: "/admin/categories", pageType: "admin", group: "Admin" },
  { key: "admin-settings", title: "Site Settings", route: "/admin/site-settings", pageType: "admin", group: "Admin" },
  { key: "admin-chat", title: "Chats", route: "/admin/chat", pageType: "admin", group: "Admin" },
  { key: "admin-notifications", title: "Notifications", route: "/admin/notifications", pageType: "admin", group: "Admin" },
  { key: "admin-events", title: "Events", route: "/admin/events", pageType: "admin", group: "Admin" },
  { key: "admin-games", title: "Games Manager", route: "/admin/games", pageType: "admin", group: "Admin" },
  { key: "admin-coupons", title: "Coupons", route: "/admin/coupons", pageType: "admin", group: "Admin" },
  { key: "admin-activity", title: "Activity Log", route: "/admin/activity", pageType: "admin", group: "Admin" },
  { key: "admin-visitors", title: "Live Customers", route: "/admin/visitors", pageType: "admin", group: "Admin" },
  { key: "admin-abandoned-carts", title: "Abandoned Carts", route: "/admin/abandoned-carts", pageType: "admin", group: "Admin" },
  { key: "admin-stock-alerts", title: "Stock Alerts", route: "/admin/stock-alerts", pageType: "admin", group: "Admin" },
  { key: "admin-sales-reports", title: "Sales Reports", route: "/admin/sales-reports", pageType: "admin", group: "Admin" },
  { key: "admin-reviews", title: "Reviews", route: "/admin/reviews", pageType: "admin", group: "Admin" },
  { key: "admin-tiktok", title: "TikTok Videos", route: "/admin/tiktok", pageType: "admin", group: "Admin" },
  { key: "admin-terms", title: "Pages & Legal", route: "/admin/terms", pageType: "admin", group: "Admin" },
  { key: "admin-refund-requests", title: "Refund Requests", route: "/admin/refund-requests", pageType: "admin", group: "Admin" },
  { key: "admin-product-requests", title: "Product Requests", route: "/admin/product-requests", pageType: "admin", group: "Admin" },
];

export function PagesManager({ access }: { access: Access }) {
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSlug, setNewSlug] = useState("");
  const [newType, setNewType] = useState<"store" | "admin">("store");
  const [query, setQuery] = useState("");
  const [pageFilter, setPageFilter] = useState<"all" | "store" | "admin" | "studio">("all");

  const fetchPages = useCallback(async () => {
    try {
      const data = await fetchApi("/api/owner-studio/pages");
      setPages(data);
    } catch (err: any) {
      toast({ title: "Failed to load pages", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPages();
  }, [fetchPages]);

  const handleCreate = async () => {
    const title = newTitle.trim() || (newType === "admin" ? "New Admin Page" : "New Store Page");
    const slug = newSlug.trim() || `${newType}-page-${Date.now()}`;
    try {
      const page = await fetchApi("/api/owner-studio/pages", {
        method: "POST",
        body: JSON.stringify({
          title,
          slug,
          pageType: newType
        })
      });
      setPages((prev) => [page, ...prev]);
      setSelectedId(page.id);
      setCreateOpen(false);
      setNewTitle("");
      setNewSlug("");
      toast({ title: "Page created" });
    } catch (err: any) {
      toast({ title: "Creation failed", description: err.message, variant: "destructive" });
    }
  };

  const selectedPage = pages.find((p) => p.id === selectedId) || null;
  const inventory = useMemo<InventoryItem[]>(() => {
    const systemByKey = new Map(
      pages.filter((page) => Boolean((page.content as Record<string, unknown>)?.systemPageKey))
        .map((page) => [String((page.content as Record<string, unknown>).systemPageKey), page]),
    );
    const system = SYSTEM_PAGES.map((seed) => ({ kind: "system" as const, seed, page: systemByKey.get(seed.key) }));
    const studio = pages.filter((page) => !(page.content as Record<string, unknown>)?.systemPageKey).map((page) => ({ kind: "studio" as const, page }));
    return [...system, ...studio];
  }, [pages]);
  const visibleInventory = inventory.filter((item) => {
    const page = item.kind === "system" ? item.page : item.page;
    const title = item.kind === "system" ? item.seed.title : item.page.title;
    const route = item.kind === "system" ? item.seed.route : `/${item.page.slug}`;
    const type = item.kind === "system" ? item.seed.pageType : item.page.pageType;
    if (pageFilter === "studio" && item.kind !== "studio") return false;
    if (pageFilter !== "all" && pageFilter !== "studio" && type !== pageFilter) return false;
    const needle = query.trim().toLowerCase();
    return !needle || `${title} ${route}`.toLowerCase().includes(needle);
  });

  const openSystemPage = async (seed: SystemPageSeed, existing?: Page) => {
    if (existing) { setSelectedId(existing.id); return; }
    if (!access.isOwner) {
      toast({ title: "Owner approval needed", description: "Only the Owner can start editing a built-in FirstPick page.", variant: "destructive" });
      return;
    }
    try {
      const created = await fetchApi("/api/owner-studio/pages", {
        method: "POST",
        body: JSON.stringify({ title: `${seed.title} Layer`, slug: `studio-${seed.key}`, pageType: seed.pageType }),
      }) as Page;
      const page = await fetchApi(`/api/owner-studio/pages/${created.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          version: created.version,
          content: { sections: [], systemPageKey: seed.key, systemRoute: seed.route },
        }),
      }) as Page;
      setPages((current) => [page, ...current]);
      setSelectedId(page.id);
      toast({ title: `${seed.title} is ready`, description: "Add sections to this page layer, then publish when ready." });
    } catch (error: any) {
      toast({ title: "Could not open page", description: error.message, variant: "destructive" });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 10 }}
      className="flex w-full h-full absolute inset-0"
    >
      {/* Sidebar: Page List */}
      <aside className="w-16 sm:w-64 shrink-0 flex-col border-r border-white/5 bg-[#0a0a0a] flex h-full">
        <div className="flex items-center justify-center sm:justify-between p-4 border-b border-white/5 shrink-0">
          <h2 className="hidden sm:block text-xs font-black uppercase tracking-widest text-gray-400">All FirstPick Pages</h2>
          <Button size="icon" variant="ghost" className="h-6 w-6 rounded-md hover:bg-white/10 hover:text-white" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="hidden sm:block border-b border-white/5 p-3 space-y-2">
          <label className="relative block"><Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-gray-500" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a page" className="w-full rounded-lg border border-white/10 bg-black py-2 pl-7 pr-2 text-[10px] text-white outline-none focus:border-primary/60" /></label>
          <div className="grid grid-cols-4 gap-1">
            {(["all", "store", "admin", "studio"] as const).map((filter) => <button key={filter} onClick={() => setPageFilter(filter)} className={`rounded px-1 py-1.5 text-[9px] font-black uppercase ${pageFilter === filter ? "bg-primary/15 text-primary" : "text-gray-500 hover:text-gray-200"}`}>{filter}</button>)}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
          {loading ? (
            <p className="p-4 text-center text-xs text-gray-600 hidden sm:block">Loading...</p>
          ) : visibleInventory.length === 0 ? (
            <p className="p-4 text-center text-xs text-gray-600 hidden sm:block">No pages match this filter.</p>
          ) : (
            visibleInventory.map((item) => {
              const isSystem = item.kind === "system";
              const p = isSystem ? item.page : item.page;
              const title = isSystem ? item.seed.title : item.page.title;
              const route = isSystem ? item.seed.route : `/${item.page.slug}`;
              const type = isSystem ? item.seed.pageType : item.page.pageType;
              const active = Boolean(p && selectedId === p.id);
              return (
              <button
                key={isSystem ? item.seed.key : item.page.id}
                onClick={() => isSystem ? void openSystemPage(item.seed, p) : setSelectedId(item.page.id)}
                className={`w-full flex items-center justify-center sm:justify-between rounded-lg p-2 sm:px-3 text-left transition-all ${
                   active ? "bg-primary/10 border border-primary/20" : "hover:bg-white/5 border border-transparent"
                }`}
              >
                <div className="hidden sm:block min-w-0 flex-1">
                  <p className={`truncate text-sm font-bold ${active ? "text-primary" : "text-gray-300"}`}>
                    {title}
                  </p>
                  <p className="truncate text-[10px] text-gray-500 font-mono">{route}</p>
                </div>
                <div className="sm:hidden text-xs font-bold text-gray-300">
                   {title.charAt(0).toUpperCase()}
                </div>
                <div className="hidden sm:block">
                   {isSystem && !p && <Layers3 className="h-3.5 w-3.5 text-gray-500" />}
                   {p?.status === "published" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-green-500 shrink-0" />
                  )}
                   {p?.status === "draft" && (
                    <div className="h-1.5 w-1.5 rounded-full bg-orange-500 shrink-0" />
                  )}
                </div>
              </button>
            )})
          )}
        </div>
      </aside>

      {/* Main Editor */}
      <div className="flex-1 flex bg-[#050505] overflow-hidden">
        {selectedPage ? (
          <PageEditor 
            key={selectedPage.id}
            page={selectedPage} 
            isOwner={access.isOwner}
            onChange={(updated) => setPages((current) => current.map((p) => p.id === updated.id ? updated : p))}
            onDelete={(id) => {
               setPages((current) => current.filter(p => p.id !== id));
              setSelectedId(null);
            }}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-600">
            <Monitor className="h-12 w-12 mb-4 opacity-20" />
            <p className="text-sm font-bold uppercase tracking-wider text-center px-4">Select a page to edit</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {createOpen && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="absolute inset-0 z-30 grid place-items-center bg-black/70 p-4 backdrop-blur-sm">
            <motion.form
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              onSubmit={(event) => { event.preventDefault(); void handleCreate(); }}
              className="w-full max-w-md rounded-2xl border border-white/10 bg-[#101010] p-5 shadow-2xl"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-primary">Owner Studio</p>
                  <h2 className="mt-1 text-lg font-black text-white">Create a page</h2>
                </div>
                <button type="button" onClick={() => setCreateOpen(false)} className="rounded-lg p-1.5 text-gray-500 hover:bg-white/10 hover:text-white"><X className="h-4 w-4" /></button>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2">
                {(["store", "admin"] as const).map((type) => (
                  <button key={type} type="button" onClick={() => setNewType(type)} className={`rounded-xl border px-3 py-3 text-left transition-colors ${newType === type ? "border-primary/60 bg-primary/10 text-primary" : "border-white/10 bg-black text-gray-400 hover:border-white/20"}`}>
                    <span className="block text-xs font-black uppercase tracking-wider">{type === "store" ? "Store page" : "Admin page"}</span>
                    <span className="mt-1 block text-[10px] leading-4 text-current/70">{type === "store" ? "Published safely at its public URL." : "Private at /admin/studio/your-slug."}</span>
                  </button>
                ))}
              </div>
              <label className="mt-4 block text-[10px] font-black uppercase tracking-wider text-gray-500">Page name
                <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} placeholder={newType === "admin" ? "Inventory helper" : "Back to School"} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" />
              </label>
              <label className="mt-3 block text-[10px] font-black uppercase tracking-wider text-gray-500">URL slug
                <input value={newSlug} onChange={(event) => setNewSlug(event.target.value)} placeholder={newType === "admin" ? "inventory-helper" : "back-to-school"} className="mt-1.5 w-full rounded-lg border border-white/10 bg-black px-3 py-2.5 text-sm text-white outline-none focus:border-primary/60" />
              </label>
              <p className="mt-3 text-[10px] leading-4 text-gray-500">{newType === "admin" ? "Admin pages are never public and default to Owner-only access." : "Store pages remain private drafts until the Owner publishes them."}</p>
              <Button type="submit" className="mt-5 w-full fire-gradient border-none font-black uppercase tracking-wider">Create blank page</Button>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
