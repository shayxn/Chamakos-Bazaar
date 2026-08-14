/**
 * FirstPick+ — customer-facing membership landing page.
 * Benefits are fetched from the admin-configured site settings.
 * Join CTA opens WhatsApp with a pre-filled message.
 */
import { useEffect, useState, memo } from "react";
import { motion } from "framer-motion";
import { Truck, Tag, Sparkles, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageTransition } from "@/components/page-transition";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
const EASE = [0.16, 1, 0.3, 1] as const;

interface SiteSettings { whatsapp_number?: string; [k: string]: string | undefined; }
interface FpSettings {
  fp_plus_price: string;
  fp_plus_launched: string;
  fp_plus_free_delivery: string;
  fp_plus_order_discount: string;
  fp_plus_exclusive_deals: string;
  fp_plus_early_access: string;
}
interface FpStatus { status: string | null; }

const BENEFIT_DEFS = [
  {
    settingKey: "fp_plus_free_delivery" as const,
    icon: Truck,
    title: "Free Standard Delivery",
    desc: "Zero delivery fees on every standard delivery order.",
    color: "#22c55e",
    glow: "rgba(34,197,94,0.18)",
  },
  {
    settingKey: "fp_plus_order_discount" as const,
    icon: Tag,
    title: "AED {discount} Off Every Order",
    desc: "An instant discount applied automatically at checkout.",
    color: "#ff6600",
    glow: "rgba(255,102,0,0.18)",
  },
  {
    settingKey: "fp_plus_exclusive_deals" as const,
    icon: Sparkles,
    title: "Exclusive Member Deals",
    desc: "Special pricing and promotions only for FirstPick+ members.",
    color: "#a855f7",
    glow: "rgba(168,85,247,0.18)",
  },
  {
    settingKey: "fp_plus_early_access" as const,
    icon: Zap,
    title: "Early Access to Drops",
    desc: "Be first in line for limited editions and new collections.",
    color: "#eab308",
    glow: "rgba(234,179,8,0.18)",
  },
];

function buildWaLink(number: string, price: string): string {
  const n = number.replace(/[^0-9]/g, "");
  const text = encodeURIComponent(`Hi! 👋 I am interested in the FirstPick+ membership (AED ${price}/month).`);
  return `https://wa.me/${n}?text=${text}`;
}

// Memoized benefit card
const BenefitCard = memo(function BenefitCard({
  icon: Icon, title, desc, color, glow, index, settingKey,
}: { icon: React.ElementType; title: string; desc: string; color: string; glow: string; index: number; settingKey: string }) {
  void settingKey; // consumed by caller for React key; kept here to avoid spread-key warning
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 + index * 0.07, duration: 0.4, ease: EASE }}
      className="relative overflow-hidden rounded-2xl p-5 space-y-2"
      style={{
        background: "rgba(255,255,255,0.04)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(12px)",
        boxShadow: `0 4px 24px ${glow}`,
        willChange: "transform",
      }}
    >
      <div className="absolute top-0 left-0 w-24 h-24 rounded-full pointer-events-none opacity-25"
        style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, transform: "translate(-30%,-30%)" }} />
      <div className="relative flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}20`, border: `1px solid ${color}40` }}>
          <Icon className="h-4 w-4" style={{ color }} />
        </div>
        <h3 className="font-black text-sm uppercase tracking-wide leading-tight">{title}</h3>
      </div>
      <p className="relative text-xs text-muted-foreground leading-relaxed pl-12">{desc}</p>
    </motion.div>
  );
});

export default function FirstPickPlus() {
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({});
  const [fpSettings, setFpSettings] = useState<FpSettings>({
    fp_plus_price: "30",
    fp_plus_launched: "false",
    fp_plus_free_delivery: "true",
    fp_plus_order_discount: "5",
    fp_plus_exclusive_deals: "true",
    fp_plus_early_access: "true",
  });
  const [fpStatus, setFpStatus] = useState<FpStatus>({ status: null });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    Promise.all([
      fetch(`${BASE}/api/settings`, { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
      fetch(`${BASE}/api/firstpick-plus/settings`, { credentials: "include" }).then((r) => r.json()).catch(() => ({})),
      fetch(`${BASE}/api/firstpick-plus/my-status`, { credentials: "include" }).then((r) => r.json()).catch(() => ({ status: null })),
    ]).then(([site, fp, status]) => {
      if (!alive) return;
      setSiteSettings(site ?? {});
      setFpSettings((prev) => ({ ...prev, ...fp }));
      setFpStatus(status ?? { status: null });
    }).finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const price      = fpSettings.fp_plus_price ?? "30";
  const discount   = parseFloat(fpSettings.fp_plus_order_discount ?? "5") || 0;
  const waLink     = buildWaLink(siteSettings.whatsapp_number ?? "971000000000", price);
  const isMember   = fpStatus.status === "active";

  // Build active benefits list
  const activeBenefits = BENEFIT_DEFS.filter((b) => {
    if (b.settingKey === "fp_plus_order_discount") return discount > 0;
    return fpSettings[b.settingKey] !== "false";
  }).map((b) => ({
    ...b,
    title: b.settingKey === "fp_plus_order_discount"
      ? `AED ${discount} Off Every Order`
      : b.title,
  }));

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 rounded-full border-2 border-transparent border-t-orange-500"
          style={{ willChange: "transform" }}
        />
      </div>
    );
  }

  return (
    <PageTransition>
      <div className="min-h-screen px-4 py-12 max-w-3xl mx-auto space-y-10">

        {/* ── Hero with logo ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: EASE }}
          className="text-center space-y-5"
        >
          <motion.img
            src={`${BASE}/firstpick-plus-logo.png`}
            alt="FirstPick+"
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, ease: EASE }}
            className="h-32 w-auto mx-auto object-contain"
            style={{ filter: "drop-shadow(0 0 40px rgba(255,102,0,0.5))", willChange: "transform" }}
          />

          <p className="text-base text-muted-foreground font-medium">
            The premium membership for the real collectors.
          </p>

          {/* Price badge */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.4, ease: EASE }}
            className="inline-flex items-baseline gap-1.5 px-5 py-2.5 rounded-full"
            style={{
              background: "linear-gradient(135deg, rgba(255,102,0,0.15), rgba(255,204,0,0.1))",
              border: "1px solid rgba(255,102,0,0.35)",
              boxShadow: "0 4px 24px rgba(255,102,0,0.15)",
            }}
          >
            <span className="text-3xl font-black text-primary font-mono">AED {price}</span>
            <span className="text-sm text-muted-foreground font-bold">/ month</span>
          </motion.div>
        </motion.div>

        {/* ── Benefits grid ── */}
        {activeBenefits.length > 0 && (
          <div className={`grid gap-4 ${activeBenefits.length === 1 ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-2"}`}>
            {activeBenefits.map((b, i) => (
              <BenefitCard key={b.settingKey} {...b} index={i} />
            ))}
          </div>
        )}

        {/* ── CTA or Member status ── */}
        <motion.div
          initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.4, ease: EASE }}
          className="rounded-2xl p-6 space-y-4 text-center relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.1)",
            backdropFilter: "blur(16px)",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.07)",
          }}
        >
          <div className="absolute inset-0 pointer-events-none glass-shine" />

          {isMember ? (
            <div className="relative space-y-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-bold text-sm"
                style={{ background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.35)", color: "#22c55e" }}>
                <CheckCircle2 className="h-4 w-4" />
                You're a FirstPick+ Member
              </div>
              <p className="text-muted-foreground text-sm">
                Your perks are active and applied automatically at every checkout.
              </p>
              {activeBenefits.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center pt-1">
                  {activeBenefits.map((b) => (
                    <span key={b.settingKey} className="text-[11px] font-bold px-3 py-1 rounded-full"
                      style={{ background: `${b.color}18`, border: `1px solid ${b.color}30`, color: b.color }}>
                      ✓ {b.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="relative space-y-4">
              <div>
                <p className="font-black text-lg uppercase tracking-wide">Ready to join?</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Message us on WhatsApp to get started — takes less than 2 minutes.
                </p>
              </div>

              <a href={waLink} target="_blank" rel="noopener noreferrer">
                <Button
                  size="lg"
                  className="w-full h-14 font-black uppercase tracking-widest gap-2 text-base border-none"
                  style={{
                    background: "linear-gradient(135deg, #25D366, #128C7E)",
                    boxShadow: "0 0 30px rgba(37,211,102,0.35)",
                  }}
                >
                  {/* WhatsApp icon */}
                  <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white shrink-0" xmlns="http://www.w3.org/2000/svg">
                    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                    <path d="M12 0C5.373 0 0 5.373 0 12c0 2.117.554 4.1 1.522 5.822L0 24l6.395-1.68A11.95 11.95 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.818 9.818 0 0 1-5.034-1.386l-.361-.214-3.735.98.998-3.648-.236-.374A9.784 9.784 0 0 1 2.182 12C2.182 6.57 6.57 2.182 12 2.182c5.43 0 9.818 4.388 9.818 9.818 0 5.43-4.388 9.818-9.818 9.818z"/>
                  </svg>
                  Join FirstPick+ on WhatsApp
                  <ArrowRight className="h-4 w-4 shrink-0" />
                </Button>
              </a>

              <p className="text-[11px] text-muted-foreground/40">Opens WhatsApp · No account needed</p>
            </div>
          )}
        </motion.div>

        {/* ── Fine print ── */}
        <p className="text-center text-[11px] text-muted-foreground/40 pb-8">
          FirstPick+ is a monthly membership. Cancel anytime by messaging us on WhatsApp.
          Benefits are applied from the moment your membership is activated by our team.
        </p>
      </div>
    </PageTransition>
  );
}
