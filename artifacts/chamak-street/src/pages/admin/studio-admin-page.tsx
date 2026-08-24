import { useEffect, useState } from "react";
import { useRoute } from "wouter";
import { motion } from "framer-motion";
import { LockKeyhole, ArrowLeft } from "lucide-react";
import { Link } from "wouter";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Element = { id?: string; type?: string; text?: string; label?: string; href?: string; url?: string; imageUrl?: string; productId?: string | number };
type Section = { id: string; label?: string; hidden?: boolean; elements?: Element[] };
type AdminPage = { title: string; content: { sections: Section[] } };

function ProductBinding({ id }: { id?: string | number }) {
  const [product, setProduct] = useState<any>(null);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    fetch(`${BASE}/api/products/${encodeURIComponent(String(id))}`, { signal: controller.signal })
      .then((response) => response.ok ? response.json() : null)
      .then(setProduct)
      .catch(() => setProduct(null));
    return () => controller.abort();
  }, [id]);
  if (!id) return <p className="rounded-lg border border-dashed border-white/15 p-4 text-xs text-white/40">Choose a real product ID in Owner Studio.</p>;
  if (!product) return <p className="rounded-lg border border-white/10 p-4 text-xs text-white/40">Product unavailable.</p>;
  const image = product.imageUrl || product.image || product.images?.[0];
  return <Link href={`/product/${product.id}`} className="flex max-w-md overflow-hidden rounded-xl border border-white/10 bg-black transition hover:border-primary/60">{image && <img src={image} alt={product.name} className="h-24 w-24 object-cover" />}<span className="flex min-w-0 flex-col justify-center p-3"><b className="truncate text-sm text-white">{product.name}</b><span className="mt-1 text-xs font-black text-primary">AED {product.price}</span></span></Link>;
}

function ElementView({ element }: { element: Element }) {
  if (element.type === "product") return <ProductBinding id={element.productId} />;
  if (element.type === "image" && (element.url || element.imageUrl)) {
    return <img src={element.url || element.imageUrl} alt={element.label || ""} className="w-full rounded-xl border border-white/10" />;
  }
  if (element.type === "heading") return <h2 className="text-2xl font-black tracking-tight text-white">{element.text || element.label}</h2>;
  if ((element.type === "button" || element.type === "link") && (element.href || element.url)) {
    return <Link href={element.href || element.url || "/admin"} className="inline-flex rounded-lg bg-primary px-4 py-2 text-xs font-black uppercase tracking-wider text-black">{element.text || element.label || "Open"}</Link>;
  }
  return <p className="text-sm leading-6 text-white/65">{element.text || element.label}</p>;
}

export default function StudioAdminPage() {
  const [, params] = useRoute("/admin/studio/:slug");
  const [page, setPage] = useState<AdminPage | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    fetch(`${BASE}/api/owner-studio/admin-page/${encodeURIComponent(params?.slug || "")}`, { credentials: "include", signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) throw new Error(response.status === 403 ? "You do not have access to this Studio admin page." : "Admin page unavailable.");
        return response.json() as Promise<AdminPage>;
      })
      .then(setPage)
      .catch((reason) => {
        if ((reason as Error).name !== "AbortError") setError((reason as Error).message);
      });
    return () => controller.abort();
  }, [params?.slug]);

  if (error) {
    return <div className="min-h-[50vh] grid place-items-center p-6"><div className="max-w-sm text-center"><LockKeyhole className="mx-auto mb-4 h-8 w-8 text-primary" /><h1 className="font-black text-white">{error}</h1><Link href="/admin" className="mt-4 inline-flex items-center gap-2 text-sm text-primary"><ArrowLeft className="h-4 w-4" />Back to dashboard</Link></div></div>;
  }
  if (!page) return <div className="min-h-[40vh] grid place-items-center"><div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="min-h-full p-5 md:p-8">
      <p className="mb-2 text-[10px] font-black uppercase tracking-[0.24em] text-primary">Owner Studio / Private admin page</p>
      <h1 className="mb-8 text-3xl font-black tracking-tight text-white">{page.title}</h1>
      <div className="mx-auto max-w-5xl space-y-5">
        {page.content.sections.filter((section) => !section.hidden).map((section) => (
          <section key={section.id} className="rounded-2xl border border-white/10 bg-white/[0.025] p-5 md:p-7">
            {section.label && <p className="mb-4 text-[10px] font-black uppercase tracking-[0.2em] text-primary/80">{section.label}</p>}
            <div className="space-y-4">{(section.elements ?? []).map((element, index) => <ElementView key={element.id || index} element={element} />)}</div>
          </section>
        ))}
      </div>
    </motion.main>
  );
}