import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetGlobalStoreContext, getGetGlobalStoreContextQueryKey, useSelectStoreCountry } from "@workspace/api-client-react";
import { Globe, Search, X, Check } from "lucide-react";
import { setStoreContext } from "@/lib/currency";
import { useStoreContext } from "@/components/price";
import * as Dialog from "@radix-ui/react-dialog";

const LS = "imaginate_country";

export function GlobalStoreProvider({ children }: { children: ReactNode }) {
  const q = useGetGlobalStoreContext({ query: { queryKey: getGetGlobalStoreContextQueryKey(), staleTime: 60_000, refetchOnWindowFocus: true } });
  const select = useSelectStoreCountry();
  useEffect(() => {
    if (!q.data) return;
    setStoreContext(q.data);
    // Re-validate a locally remembered country against the server list.
    try {
      const saved = localStorage.getItem(LS);
      if (!q.data.enabled) { localStorage.removeItem(LS); return; }
      const ok = q.data.countries.find((c) => c.code === saved && c.enabled);
      if (saved && ok && saved !== q.data.country.code && !select.isPending) select.mutate({ data: { code: saved } }, { onSuccess: (d) => setStoreContext(d) });
      else if (saved && !ok) localStorage.removeItem(LS);
    } catch { /* storage unavailable */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.data]);
  return <>{children}</>;
}

export function CountryChooser({ compact = false }: { compact?: boolean }) {
  const ctx = useStoreContext();
  const qc = useQueryClient();
  const select = useSelectStoreCountry();
  const [open, setOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [err, setErr] = useState("");
  const list = useMemo(() => (ctx?.countries ?? []).filter((c) => c.enabled && `${c.name} ${c.code} ${c.currency} ${c.code==="AE"?"UAE Emirates":c.code==="GB"?"UK":""}`.toLowerCase().includes(term.toLowerCase())), [ctx, term]);
  if (!ctx || !ctx.enabled) return null;
  const pick = (code: string) => {
    setErr("");
    select.mutate({ data: { code } }, {
      onSuccess: (d) => { setStoreContext(d); qc.setQueryData(getGetGlobalStoreContextQueryKey(), d); try { localStorage.setItem(LS, d.country.code); } catch { /* ignore */ } setOpen(false); },
      onError: () => { setErr("Could not change country. Please try again."); void qc.invalidateQueries({ queryKey: getGetGlobalStoreContextQueryKey() }); },
    });
  };
  return (
    <Dialog.Root open={open} onOpenChange={next => { if(next || !select.isPending) setOpen(next); }}>
      <Dialog.Trigger asChild><button type="button" aria-label={`Choose your country, currently ${ctx.country.name}`} data-testid="button-country"
        className={`liquid-pill relative z-[70] inline-flex h-10 shrink-0 items-center rounded-full font-semibold uppercase tracking-wider text-white ${compact ? "gap-1 px-2 text-[10px]" : "gap-2 px-3.5 text-[11px]"}`}>
        <Globe className="h-4 w-4" /><span>{ctx.country.code}</span>{!compact && <span className="hidden text-white/60 sm:inline">{ctx.country.currency}</span>}
      </button></Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[300] bg-black/60" />
          <Dialog.Content onEscapeKeyDown={e=>{if(select.isPending)e.preventDefault();}} onPointerDownOutside={e=>{if(select.isPending)e.preventDefault();}} className="liquid-panel fixed left-1/2 top-1/2 z-[310] flex max-h-[80dvh] w-[calc(100%-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl text-white">
            <div className="flex items-center justify-between p-4">
              <Dialog.Title className="text-sm font-semibold uppercase tracking-widest">Choose your country</Dialog.Title>
              <Dialog.Close asChild><button type="button" disabled={select.isPending} aria-label="Close" className="liquid-pill grid h-9 w-9 place-items-center rounded-full disabled:opacity-40"><X className="h-4 w-4" /></button></Dialog.Close>
            </div>
            <label className="relative mx-4 mb-3 block"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
              <input autoFocus aria-label="Search country or currency" value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Search country or currency" className="w-full rounded-full border border-white/15 bg-white/5 py-2.5 pl-9 pr-4 text-base sm:text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>
            {err && <p role="alert" className="mx-4 mb-2 text-xs text-red-300">{err}</p>}
            {select.isPending && <p role="status" className="mx-4 mb-2 text-xs text-white/60">Updating country and prices…</p>}
            <ul className="flex-1 overflow-y-auto px-2 pb-3">
              {list.length === 0 && <li className="p-6 text-center text-sm text-white/55">No matching country.</li>}
              {list.map((c) => (
                <li key={c.code}><button type="button" disabled={select.isPending} onClick={() => pick(c.code)} className="flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-left text-sm hover:bg-white/10 focus-visible:bg-white/10">
                  <span>{c.name} <span className="text-white/45">{c.code}</span></span>
                  <span className="flex items-center gap-2 text-xs text-white/60">{c.currency}{c.code === ctx.country.code && <Check className="h-4 w-4 text-primary" />}</span></button></li>
              ))}
            </ul>
            <Dialog.Description className="border-t border-white/10 p-3 text-center text-[10px] text-white/45">Prices are estimates. Orders are charged in AED.</Dialog.Description>
          </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function FxAttribution() {
  const ctx = useStoreContext();
  if (!ctx?.enabled || ctx.country.code === "AE") return null;
  return <p className="px-4 py-2 text-center text-[10px] text-white/45">{!ctx.fx.available ? "Live rates are unavailable, so prices are shown in AED. " : ctx.fx.stale ? "Cached rates may be out of date. Prices are estimates only. " : "Estimated conversion uses daily rates. "}{ctx.fx.fetchedAt && `Updated ${new Intl.DateTimeFormat("en",{dateStyle:"medium"}).format(new Date(ctx.fx.fetchedAt))}. `}<a className="underline" href="https://www.exchangerate-api.com" target="_blank" rel="noreferrer">Rates By Exchange Rate API</a></p>;
}
