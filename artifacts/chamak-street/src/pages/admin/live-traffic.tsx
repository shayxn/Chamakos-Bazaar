import { RefreshCw } from "lucide-react";
import { useMemo } from "react";
import { Link } from "wouter";
import { useGetLiveTraffic, useListProducts } from "@workspace/api-client-react";

type Traffic = {
  onlineVisitors: number;
  activeVisitors: { sessionId: string; page: string; deviceType: string; lastSeenAt: string }[];
  todayVisitors: number; weekVisitors: number; monthVisitors: number; previousMonthVisitors: number;
  totalPageViews: number; uniqueVisitors: number; newVisitors: number; returningVisitors: number;
  countryBreakdown: { country?: string; code?: string; visitors?: number }[]; countryAvailable: boolean;
  topPages: { path: string; views: number }[]; topProducts: { id: number; name: string; views: number }[];
  monthly: { month: string; visitors: number; pageViews: number }[];
  timezone: string; serverTime: string;
};
const nf = new Intl.NumberFormat("en-AE");
const glass = "glass-card rounded-2xl p-4 sm:p-5";

function Stat({ label, value, sub }: { label: string; value: number; sub?: string }) {
  return <div className={glass} data-testid={`stat-${label.toLowerCase().replace(/\s+/g, "-")}`}><p className="text-[10px] font-black uppercase tracking-widest text-white/55">{label}</p><p className="mt-2 text-3xl font-black tabular-nums">{nf.format(value)}</p>{sub && <p className="mt-1 text-xs text-white/50">{sub}</p>}</div>;
}

export default function AdminLiveTraffic() {
  const catalog = useListProducts({ limit: 100 }, { query: { queryKey: ["admin-live-products"], staleTime: 120_000 } as never });
  const names = useMemo(() => new Map(((catalog.data as { id: number; name: string }[] | undefined) ?? []).map((p) => [p.id, p.name])), [catalog.data]);
  const q = useGetLiveTraffic({ query: { queryKey: ["live-traffic"], refetchInterval: 10_000, refetchOnWindowFocus: true } as never });
  const d = q.data as Traffic | undefined;
  if (q.isLoading) return <div className="space-y-3" aria-busy="true"><div className="glass-skeleton h-28 rounded-2xl" /><div className="grid gap-3 sm:grid-cols-3"><div className="glass-skeleton h-24 rounded-2xl" /><div className="glass-skeleton h-24 rounded-2xl" /><div className="glass-skeleton h-24 rounded-2xl" /></div></div>;
  if (q.isError || !d) return <div role="alert" className={`${glass} flex items-center justify-between gap-3 text-sm text-red-200`}><span>Live traffic could not be loaded.</span><button className="inline-flex items-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-xs font-bold uppercase tracking-widest" onClick={() => q.refetch()}><RefreshCw className="h-3.5 w-3.5" />Retry</button></div>;

  const diff = d.monthVisitors - d.previousMonthVisitors;
  const pct = d.previousMonthVisitors > 0 ? (diff / d.previousMonthVisitors) * 100 : null;
  const max = Math.max(1, ...d.monthly.map((m) => m.visitors));
  const sentence = d.onlineVisitors === 1 ? "1 person is on the website right now" : `${nf.format(d.onlineVisitors)} people are on the website right now`;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h1 className="text-2xl font-black uppercase tracking-tight sm:text-3xl">Live Customers</h1>
        <p className="text-xs text-white/50">Updates every 10 seconds. Times in {d.timezone}. Last update {new Date(d.serverTime).toLocaleTimeString("en-GB", { timeZone: d.timezone })}</p>
      </div>
      <div className="glass-panel rounded-3xl p-5 sm:p-7" data-testid="text-online-now">
        <div className="flex items-center gap-3"><span className="relative flex h-3 w-3"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" /><span className="relative inline-flex h-3 w-3 rounded-full bg-primary" /></span><p className="text-xl font-bold sm:text-2xl">{sentence}</p></div>
        {d.activeVisitors.length === 0 ? <p className="mt-4 text-sm text-white/55">No active visitors at the moment.</p> : (
          <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="text-[10px] uppercase tracking-widest text-white/50"><th className="py-2 pr-3">Session</th><th className="pr-3">Viewing</th><th className="pr-3">Device</th><th>Last seen</th></tr></thead>
            <tbody>{d.activeVisitors.map((v) => <tr key={v.sessionId} className="border-t border-white/10"><td className="py-2 pr-3 font-mono text-xs">{v.sessionId}</td><td className="pr-3">{(() => { const m = /^\/product\/(\d+)/.exec(v.page); if (!m) return <span>{v.page}</span>; const id = Number(m[1]); const nm = names.get(id) ?? d.topProducts.find((p) => p.id === id)?.name; return <Link href={`/admin/products`} className="underline decoration-primary/60 underline-offset-4">{nm ? `Viewing: ${nm}` : `Viewing product #${id}`}</Link>; })()}</td><td className="pr-3 capitalize">{v.deviceType}</td><td className="text-white/60">{new Date(v.lastSeenAt).toLocaleTimeString("en-GB", { timeZone: d.timezone })}</td></tr>)}</tbody></table></div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Today" value={d.todayVisitors} /><Stat label="This week" value={d.weekVisitors} /><Stat label="This month" value={d.monthVisitors} sub={`Previous month ${nf.format(d.previousMonthVisitors)}${pct !== null ? ` (${diff >= 0 ? "+" : ""}${pct.toFixed(1)}%)` : " (no baseline)"}`} /><Stat label="Page views" value={d.totalPageViews} />
        <Stat label="Unique visitors" value={d.uniqueVisitors} /><Stat label="New visitors" value={d.newVisitors} /><Stat label="Returning visitors" value={d.returningVisitors} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <section className={glass}><h2 className="mb-3 text-sm font-black uppercase tracking-widest">Most viewed pages</h2>
          {d.topPages.length === 0 ? <p className="text-sm text-white/55">No page views recorded yet.</p> : <ul className="space-y-2 text-sm">{d.topPages.map((p) => <li key={p.path} className="flex justify-between gap-3"><span className="truncate">{p.path}</span><span className="tabular-nums text-white/60">{nf.format(p.views)}</span></li>)}</ul>}</section>
        <section className={glass}><h2 className="mb-3 text-sm font-black uppercase tracking-widest">Most viewed products</h2>
          {d.topProducts.length === 0 ? <p className="text-sm text-white/55">No product views recorded yet.</p> : <ul className="space-y-2 text-sm">{d.topProducts.map((p) => <li key={p.id} className="flex justify-between gap-3"><span className="truncate">{p.name}</span><span className="tabular-nums text-white/60">{nf.format(p.views)}</span></li>)}</ul>}</section>
      </div>
      <section className={glass}><h2 className="mb-3 text-sm font-black uppercase tracking-widest">Monthly traffic</h2>
        {d.monthly.length === 0 ? <p className="text-sm text-white/55">No monthly data yet.</p> : (
          <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead><tr className="text-[10px] uppercase tracking-widest text-white/50"><th className="py-2">Month</th><th>Visitors</th><th>Page views</th><th className="w-1/3">vs. busiest</th></tr></thead>
            <tbody>{d.monthly.map((m) => <tr key={m.month} className="border-t border-white/10"><td className="py-2">{m.month}</td><td className="tabular-nums">{nf.format(m.visitors)}</td><td className="tabular-nums">{nf.format(m.pageViews)}</td><td><div className="h-2 rounded-full bg-white/10"><div className="h-2 rounded-full bg-primary" style={{ width: `${(m.visitors / max) * 100}%` }} /></div></td></tr>)}</tbody></table></div>
        )}</section>
      <section className={glass}><h2 className="mb-3 text-sm font-black uppercase tracking-widest">Countries</h2>
        {!d.countryAvailable ? <p className="text-sm text-white/55">Country data is not reliably available, so none is shown.</p>
          : d.countryBreakdown.length === 0 ? <p className="text-sm text-white/55">No country data recorded yet.</p>
          : <ul className="space-y-2 text-sm">{d.countryBreakdown.map((c, i) => <li key={i} className="flex justify-between"><span>{c.country ?? c.code}</span><span className="tabular-nums text-white/60">{nf.format(c.visitors ?? 0)}</span></li>)}</ul>}</section>
    </div>
  );
}
