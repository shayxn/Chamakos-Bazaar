import { Link } from "wouter";
import { useLaunchClock } from "@/lib/use-launch-clock";

/** Public countdown. Shown only while enabled, started and not yet at zero. */
export function CountdownView({ data, remaining, preOrder }: { data: { headline?: string; text?: string; imageUrl?: string }; remaining: number; preOrder: boolean }) {
  const r = Math.max(0, remaining);
  const times = [Math.floor(r / 86400000), Math.floor(r / 3600000) % 24, Math.floor(r / 60000) % 60, Math.floor(r / 1000) % 60];
  return (
    <section className="relative mx-auto my-8 max-w-6xl overflow-hidden rounded-3xl glass-panel p-6 sm:p-10" aria-label="Launch countdown" data-testid="section-countdown">
      {data.imageUrl && <img src={data.imageUrl} alt="" loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30" />}
      <div className="relative">
        {data.headline && <h2 className="text-2xl font-bold sm:text-4xl">{data.headline}</h2>}
        {data.text && <p className="mt-3 max-w-xl whitespace-pre-wrap text-white/70">{data.text}</p>}
        <div className="mt-6 grid max-w-xl grid-cols-4 gap-2 sm:gap-3" role="timer">
          {times.map((v, i) => (
            <div key={i} className="glass-sm rounded-xl p-3 text-center">
              <strong className="text-2xl tabular-nums sm:text-4xl">{String(v).padStart(2, "0")}</strong>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-white/55">{["Days", "Hours", "Minutes", "Seconds"][i]}</p>
            </div>
          ))}
        </div>
        {preOrder && (
          <Link href="/shop?preorder=1" data-testid="link-preorder-now" className="mt-7 inline-flex items-center rounded-full bg-primary px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-primary-foreground transition hover:brightness-110">
            PRE-ORDER NOW
          </Link>
        )}
      </div>
    </section>
  );
}

export default function LaunchPanel() {
  const c = useLaunchClock();
  if (!c.enabled || !c.data) return null;
  const now = c.now();
  if (Number.isFinite(c.startsAt) && now < c.startsAt) return null;
  const remaining = c.deadline - now;
  if (remaining <= 0) return null;
  return <CountdownView data={c.data} remaining={remaining} preOrder={c.preOrderCount > 0} />;
}
