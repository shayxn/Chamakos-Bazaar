import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetGlobalStoreAdmin, useSaveGlobalStoreConfig, getGetGlobalStoreAdminQueryKey, getGetGlobalStoreContextQueryKey } from "@workspace/api-client-react";
import type { GlobalStoreConfig, StoreCountry, StorePaymentMethod } from "@workspace/api-client-react";
import { Plus, RefreshCw, Save, Trash2 } from "lucide-react";

const panel = "rounded-3xl border border-white/15 bg-white/[0.045] p-4 sm:p-6";
const inp = "w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2.5 text-sm text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary";
const pill = "liquid-pill inline-flex h-10 items-center justify-center gap-2 rounded-full px-5 text-xs font-semibold uppercase tracking-wider text-white disabled:opacity-40";
const CURRENCIES = ["AED","USD","EUR","GBP","SAR","QAR","KWD","BHD","OMR","INR","PKR","EGP","JOD","TRY","CAD","AUD","JPY","CNY","CHF","SEK","NOK","DKK","SGD","MYR","ZAR","NZD","HKD","KRW","BRL","MXN"];

function useConfig() {
  const q = useGetGlobalStoreAdmin({ query: { queryKey: getGetGlobalStoreAdminQueryKey(), refetchOnMount: "always", staleTime: 0 } });
  const save = useSaveGlobalStoreConfig();
  const qc = useQueryClient();
  const [draft, setDraft] = useState<GlobalStoreConfig | null>(null);
  const [msg, setMsg] = useState("");
  const [conflict, setConflict] = useState(false);
  useEffect(() => { if (q.data && !draft) setDraft(q.data.config); }, [q.data, draft]);
  const catalog = useMemo(() => q.data?.countryCatalog ?? [], [q.data]);
  const dirty = !!draft && !!q.data && JSON.stringify(draft) !== JSON.stringify(q.data.config);
  const submit = () => {
    if (!draft) return;
    setMsg(""); setConflict(false);
    save.mutate({ data: draft }, {
      onSuccess: (res) => { qc.setQueryData(getGetGlobalStoreAdminQueryKey(), res); setDraft(res.config); setMsg("Saved."); void qc.invalidateQueries({ queryKey: getGetGlobalStoreContextQueryKey() }); },
      onError: (e) => { const st = (e as { status?: number }).status; if (st === 409) setConflict(true); else setMsg((e as Error).message || "Could not save."); },
    });
  };
  const reload = async () => { setConflict(false); setMsg(""); const r = await q.refetch(); if (r.data) setDraft(r.data.config); };
  return { catalog, q, draft, setDraft, dirty, submit, save, msg, conflict, reload };
}

function Shell({ title, intro, h, children }: { title: string; intro: string; h: ReturnType<typeof useConfig>; children: React.ReactNode }) {
  return (
    <div className="space-y-5 text-white">
      <div><h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">{title}</h1><p className="mt-1 max-w-2xl text-sm text-white/60">{intro}</p></div>
      {h.q.isLoading && <div className="h-40 animate-pulse rounded-3xl bg-white/5" aria-busy="true" />}
      {h.q.isError && <div role="alert" className={`${panel} flex items-center justify-between gap-3 text-sm text-red-200`}>Only the owner can open this page, or it failed to load.<button className={pill} onClick={() => h.q.refetch()}><RefreshCw className="h-4 w-4" />Retry</button></div>}
      {h.conflict && <div role="alert" className={`${panel} border-amber-300/40 text-sm text-amber-100`}>Someone saved newer changes. Reload to see them before editing again.<button className={`${pill} ml-3`} onClick={() => void h.reload()}>Reload latest</button></div>}
      {h.draft && children}
      {h.draft && (
        <div className="sticky bottom-3 flex flex-wrap items-center gap-3">
          <button className={pill} disabled={!h.dirty || h.save.isPending} onClick={h.submit} data-testid="button-save-global"><Save className="h-4 w-4" />{h.save.isPending ? "Saving" : "Save changes"}</button>
          {h.msg && <span role="status" className="text-sm text-white/70">{h.msg}</span>}
        </div>
      )}
    </div>
  );
}

export function GlobalSwitchPage() {
  const h = useConfig();
  const [term, setTerm] = useState("");
  const d = h.draft;
  const rows = useMemo(() => (d?.countries ?? []).filter((c) => `${c.name} ${c.code}`.toLowerCase().includes(term.toLowerCase())), [d, term]);
  const removed = useMemo(() => h.catalog.filter((c) => !(d?.countries ?? []).some((x) => x.code === c.code)), [h.catalog, d]);
  const [readd, setReadd] = useState("");
  const patch = (code: string, p: Partial<StoreCountry>) => h.setDraft((cur) => cur && { ...cur, countries: cur.countries.map((c) => (c.code === code ? { ...c, ...p } : c)) });
  return (
    <Shell title="Global Switch" h={h} intro="When off, the store sells to the UAE only and shoppers see no country switch. When on, shoppers can pick an enabled country. Prices are shown as estimates; every charge settles in AED.">
      {d && (
        <>
          <label className={`${panel} flex items-center justify-between gap-4`}>
            <span><span className="block text-sm font-bold">Global store</span><span className="text-xs text-white/55">{d.enabled ? "On: enabled countries can shop." : "Off: UAE only."}</span></span>
            <input type="checkbox" role="switch" className="h-6 w-6 accent-primary" checked={d.enabled} onChange={(e) => h.setDraft({ ...d, enabled: e.target.checked })} data-testid="switch-global" />
          </label>
          <div className={`${panel} space-y-3`}>
            <input className={inp} placeholder="Search countries" aria-label="Search countries" value={term} onChange={(e) => setTerm(e.target.value)} />
            <p className="text-xs text-white/50">UAE delivery uses the existing shipping settings. The foreign shipping fee below is in AED and applies to Standard delivery only. Leave it empty to mark delivery as not configured, which blocks checkout for that country.</p>
            {removed.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Re-add a removed country" className={`${inp} max-w-xs`} value={readd} onChange={(e) => setReadd(e.target.value)}>
                  <option value="">Re-add a removed country</option>
                  {removed.map((c) => <option key={c.code} value={c.code}>{c.name} ({c.code})</option>)}
                </select>
                <button type="button" className={pill} disabled={!readd} onClick={() => { const c = removed.find((x) => x.code === readd); if (c) h.setDraft((cur) => cur && { ...cur, countries: [...cur.countries, { ...c, enabled: true, shippingAED: c.code === "AE" ? c.shippingAED : null }] }); setReadd(""); }}><Plus className="h-4 w-4" />Re-add</button>
              </div>
            )}
            <div className="max-h-[60dvh] overflow-auto">
              <table className="w-full min-w-[680px] text-left text-sm">
                <thead className="sticky top-0 bg-[#141218] text-[10px] uppercase tracking-widest text-white/50"><tr><th className="p-2">Country</th><th className="p-2">Enabled</th><th className="p-2">Currency</th><th className="p-2">Shipping fee (AED)</th><th className="p-2"><span className="sr-only">Remove</span></th></tr></thead>
                <tbody>
                  {rows.map((c) => (
                    <tr key={c.code} className="border-t border-white/5">
                      <td className="p-2">{c.name} <span className="text-white/40">{c.code}</span></td>
                       <td className="p-2"><input type="checkbox" aria-label={`Enable ${c.name}`} className="h-5 w-5 accent-primary" checked={c.enabled} onChange={(e) => patch(c.code, { enabled: e.target.checked })} /></td>
                      <td className="p-2"><select aria-label={`Currency for ${c.name}`} className={inp} value={c.currency} onChange={(e) => patch(c.code, { currency: e.target.value })}>{[...new Set([c.currency, ...CURRENCIES])].map((x) => <option key={x}>{x}</option>)}</select></td>
                      <td className="p-2">{c.code === "AE" ? <span className="text-xs text-white/45">Uses delivery settings</span> : <input aria-label={`Shipping fee for ${c.name}`} type="number" min="0" step="0.01" className={inp} placeholder="Not configured" value={c.shippingAED ?? ""} onChange={(e) => patch(c.code, { shippingAED: e.target.value === "" ? null : Math.max(0, Number(e.target.value)) })} />}</td>
                       <td className="p-2"><button type="button" aria-label={`Remove ${c.name}`} className="liquid-pill grid h-9 w-9 place-items-center rounded-full text-red-300" onClick={() => h.setDraft((cur) => cur && { ...cur, countries: cur.countries.filter((x) => x.code !== c.code) })}><Trash2 className="h-4 w-4" /></button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {rows.length === 0 && <p className="p-6 text-center text-sm text-white/55">No matching country.</p>}
            </div>
          </div>
        </>
      )}
    </Shell>
  );
}

export function PaymentMethodsPage() {
  const h = useConfig();
  const d = h.draft;
  const providers = h.q.data?.providers;
  const patch = (id: string, p: Partial<StorePaymentMethod>) => h.setDraft((cur) => cur && { ...cur, paymentMethods: cur.paymentMethods.map((m) => (m.id === id ? { ...m, ...p } : m)) });
  const add = (provider: "cod" | "ziina") => h.setDraft((cur) => cur && { ...cur, paymentMethods: [...cur.paymentMethods, { id: `${provider}-${Date.now().toString(36)}`, label: provider === "cod" ? "Cash on Delivery" : "Pay online", provider, enabled: false, countries: provider === "cod" ? ["AE"] : [] }] });
  const enabledCountries = (d?.countries ?? []).filter((c) => c.enabled);
  return (
    <Shell title="Payment Methods" h={h} intro="Cash on Delivery is UAE only. Online payment through Ziina is only usable once credentials are configured on the server. An empty country list means every enabled country.">
      {d && (
        <>
          <p className="text-xs text-white/55">Ziina credentials: {providers?.ziina ? "configured" : "not configured, methods stay unavailable at checkout"}.</p>
          <div className="space-y-3">
            {d.paymentMethods.length === 0 && <div className={`${panel} text-center text-sm text-white/60`}>No payment methods yet. Add one below.</div>}
            {d.paymentMethods.map((m) => (
              <div key={m.id} className={`${panel} space-y-3`}>
                <div className="flex flex-wrap items-center gap-3">
                  <input aria-label="Label" className={`${inp} min-w-0 flex-1`} value={m.label} onChange={(e) => patch(m.id, { label: e.target.value })} />
                  <span className="rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-widest text-white/70">{m.provider}</span>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-5 w-5 accent-primary" checked={m.enabled} onChange={(e) => patch(m.id, { enabled: e.target.checked })} />Enabled</label>
                  <button aria-label={`Remove ${m.label}`} className="liquid-pill grid h-10 w-10 place-items-center rounded-full text-red-300" onClick={() => h.setDraft({ ...d, paymentMethods: d.paymentMethods.filter((x) => x.id !== m.id) })}><Trash2 className="h-4 w-4" /></button>
                </div>
                {m.provider === "ziina" && !providers?.ziina && <p className="text-xs text-amber-200">Setup unavailable: Ziina is not configured.</p>}
                {m.provider === "cod" ? <p className="text-xs text-white/50">Available in the UAE only.</p> : (
                  <fieldset className="space-y-2"><legend className="text-[10px] uppercase tracking-widest text-white/55">Countries {m.countries.length === 0 && "(all enabled)"}</legend>
                    <div className="flex max-h-32 flex-wrap gap-1.5 overflow-auto">
                      {enabledCountries.map((c) => { const on = m.countries.includes(c.code); return <button type="button" key={c.code} aria-pressed={on} onClick={() => patch(m.id, { countries: on ? m.countries.filter((x) => x !== c.code) : [...m.countries, c.code] })} className={`jelly rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/25" : "border-white/15 text-white/60"}`}>{c.code}</button>; })}
                    </div></fieldset>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2"><button className={pill} onClick={() => add("cod")}><Plus className="h-4 w-4" />Cash on Delivery</button><button className={pill} onClick={() => add("ziina")}><Plus className="h-4 w-4" />Ziina</button></div>
        </>
      )}
    </Shell>
  );
}
