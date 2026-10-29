import { formatPrice } from "@/lib/currency";

export type PersonalizedLike = {
  personalizationName?: string | null;
  personalizationNumber?: string | null;
  personalizationFee?: number | null;
};

export const PERSONALIZATION_OPTION_FEE = 10;

export function hasPersonalization(raw: object) {
  const item = raw as PersonalizedLike;
  return !!(item.personalizationName || item.personalizationNumber);
}

/** Plain-text summary for print/canvas output. Fee is per unit and already included in item.price. */
export function personalizationText(raw: object) {
  const item = raw as PersonalizedLike;
  if (!hasPersonalization(item)) return "";
  const parts: string[] = [];
  if (item.personalizationName) parts.push(`Name: "${item.personalizationName}"`);
  if (item.personalizationNumber) parts.push(`No: ${item.personalizationNumber}`);
  const fee = Number(item.personalizationFee ?? 0);
  return `Personalised — ${parts.join(" · ")}${fee > 0 ? ` (+AED ${fee.toFixed(2)}/unit incl.)` : ""}`;
}

export function PersonalizationLine({ item: raw, className = "", testId }: { item: object; className?: string; testId?: string }) {
  const item = raw as PersonalizedLike;
  if (!hasPersonalization(item)) return null;
  const fee = Number(item.personalizationFee ?? 0);
  return (
    <div className={`mt-1 flex flex-wrap items-center gap-1.5 text-[11px] ${className}`} data-testid={testId ?? "text-personalization"}>
      <span className="rounded-sm border border-primary/30 bg-primary/10 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-primary">Personalised</span>
      {item.personalizationName && <span className="text-white/80">Name: <strong className="font-mono">{item.personalizationName}</strong></span>}
      {item.personalizationNumber && <span className="text-white/80">No: <strong className="font-mono">{item.personalizationNumber}</strong></span>}
      {fee > 0 && <span className="text-muted-foreground">+{formatPrice(fee)}/unit (included)</span>}
    </div>
  );
}
