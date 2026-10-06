import { Link } from "wouter";
import { useLaunchClock } from "@/lib/use-launch-clock";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
export const LAUNCH_ZERO_TEXT = "We know you're excited, just a moment!";

type ViewProps = { data: { headline?: string; text?: string; imageUrl?: string }; remaining: number; preOrder: boolean; zero?: boolean; onPreOrder?: () => void; fill?: boolean };

/** Countdown content in the boot-screen style. Not fixed-positioned, so it is safe inside admin previews. */
export function CountdownView({ data, remaining, preOrder, zero, onPreOrder, fill }: ViewProps) {
  const r = Math.ceil(Math.max(0, remaining) / 1000) * 1000;
  const times = [Math.floor(r / 86400000), Math.floor(r / 3600000) % 24, Math.floor(r / 60000) % 60, Math.floor(r / 1000) % 60];
  const labels = ["Days", "Hours", "Minutes", "Seconds"];
  const spoken = `${times[0]} days, ${times[1]} hours, ${times[2]} minutes, ${times[3]} seconds remaining`;
  return (
    <section className={`imaginate-boot relative flex flex-col items-center justify-center gap-7 overflow-hidden bg-black px-6 py-12 text-center ${fill ? "min-h-full w-full" : "min-h-[26rem] rounded-3xl"}`} aria-label="Launch countdown" data-testid="section-countdown">
      <div className="imaginate-boot-glow" aria-hidden="true" />
      <div className="imaginate-boot-logo relative">
        <img src={`${BASE}/imaginate-logo.png`} alt="IMAGINATE" width="256" className="relative z-10 h-auto w-48 object-contain sm:w-64" />
        <svg className="imaginate-bolt" viewBox="0 0 200 80" aria-hidden="true">
          <polyline points="0,40 38,30 62,46 96,26 130,48 164,32 200,42" fill="none" stroke="#b79cff" strokeWidth="1.2" strokeLinejoin="round" />
        </svg>
      </div>
      {zero ? (
        <p className="relative z-10 max-w-xl text-2xl font-semibold text-white sm:text-4xl" role="status" data-testid="text-launch-wait">{LAUNCH_ZERO_TEXT}</p>
      ) : (
        <div className="relative z-10 flex w-full flex-col items-center gap-6">
          {data.headline && <h2 className="text-lg font-bold text-white sm:text-2xl">{data.headline}</h2>}
          {data.text && <p className="max-w-md whitespace-pre-wrap text-sm text-white/65">{data.text}</p>}
          <div className="grid w-full max-w-xl grid-cols-4 gap-2 sm:gap-4" role="timer" aria-label={spoken}>
            {times.map((v, i) => (
              <div key={i} className="rounded-xl border border-primary/30 bg-white/[0.03] px-1 py-3 sm:py-4" aria-hidden="true">
                <strong className="block text-3xl font-bold tabular-nums text-white sm:text-5xl" style={{ textShadow: "0 0 18px rgba(183,156,255,0.55)" }} data-testid={`text-countdown-${labels[i].toLowerCase()}`}>{String(v).padStart(2, "0")}</strong>
                <span className="mt-1 block text-[10px] uppercase tracking-widest text-white/55">{labels[i]}</span>
              </div>
            ))}
          </div>
          {preOrder && (
            <Link href="/shop?preorder=1" onClick={onPreOrder} data-testid="link-preorder-now" className="inline-flex items-center rounded-full border border-primary/60 bg-primary px-8 py-3.5 text-xs font-black uppercase tracking-[0.2em] text-primary-foreground transition hover:brightness-110">
              Pre-Order
            </Link>
          )}
        </div>
      )}
    </section>
  );
}

/** Inline preview only; the public storefront countdown is the fullscreen LaunchSequence overlay. */
export default function LaunchPanel() {
  const c = useLaunchClock();
  if (!c.enabled || !c.data) return null;
  const now = c.now();
  if (Number.isFinite(c.startsAt) && now < c.startsAt) return null;
  const remaining = c.deadline - now;
  if (remaining <= 0) return null;
  return <CountdownView data={c.data} remaining={remaining} preOrder={c.preOrderCount > 0} />;
}
