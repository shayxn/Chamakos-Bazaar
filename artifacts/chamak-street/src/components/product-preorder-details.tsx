import { useEffect, useState } from "react";

// A month or date without a time zone is display text, not a countdown deadline.
export function parseCountdownDeadline(value?: string | null): number | null {
  if (!value || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const calendarDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  if (!Number.isFinite(calendarDate.getTime()) || calendarDate.toISOString().slice(0, 10) !== value.slice(0, 10)) return null;
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

export function ProductPreorderDetails({ date, note, label }: {
  date?: string | null;
  note?: string | null;
  label?: string | null;
}) {
  const deadline = parseCountdownDeadline(date);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (deadline === null || deadline <= Date.now()) return;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = Date.now();
      setNow(current);
      if (current < deadline) timer = setTimeout(tick, document.hidden ? 30_000 : 1_000);
    };
    const resume = () => { clearTimeout(timer); tick(); };
    timer = setTimeout(tick, 1_000);
    document.addEventListener("visibilitychange", resume);
    return () => { clearTimeout(timer); document.removeEventListener("visibilitychange", resume); };
  }, [deadline]);

  const remaining = deadline === null ? 0 : Math.max(0, deadline - now);
  const segments = [
    ["Days", Math.floor(remaining / 86_400_000)],
    ["Hours", Math.floor(remaining / 3_600_000) % 24],
    ["Minutes", Math.floor(remaining / 60_000) % 60],
    ["Seconds", Math.floor(remaining / 1_000) % 60],
  ] as const;
  return (
    <section className="rounded-xl border border-primary/20 bg-primary/[0.06] p-5" data-testid="preorder-details" aria-label="Pre-order details">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{label?.trim() || "Pre-order available"}</p>
      {deadline !== null && remaining > 0 ? (
        <div className="mt-4 grid grid-cols-4 gap-2" data-testid="preorder-countdown" role="timer" aria-label="Time until the configured pre-order date">
          {segments.map(([name, value]) => (
            <div key={name} className="rounded-lg bg-black/20 py-3 text-center">
              <span className="block text-2xl font-semibold tabular-nums text-white">{String(value).padStart(2, "0")}</span>
              <span className="mt-1 block text-[9px] uppercase tracking-wider text-white/50">{name}</span>
            </div>
          ))}
        </div>
      ) : date?.trim() ? (
        <p className="mt-3 text-sm text-white/70">{deadline !== null ? `Configured date: ${new Date(deadline).toLocaleString()}` : `Expected date: ${date}`}</p>
      ) : null}
      {note?.trim() && <p className="mt-3 text-sm leading-6 text-white/65">{note}</p>}
    </section>
  );
}
