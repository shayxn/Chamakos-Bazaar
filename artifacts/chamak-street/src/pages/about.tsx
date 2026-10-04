import { ArrowRight } from "lucide-react";
import { Link } from "wouter";
import { useSettings } from "@/lib/use-settings";

export default function AboutPage() {
  const settings = useSettings();

  return (
    <main className="min-h-[70vh] bg-[#111113] px-6 py-20 text-[#f4f2f7] sm:px-10 sm:py-28 lg:px-[8vw]">
      <div className="mx-auto max-w-5xl">
        <p className="mb-5 text-[10px] uppercase tracking-[.3em] text-[#bba4f4]">IMAGINATE / UAE</p>
        <h1 className="max-w-4xl text-[clamp(3.5rem,10vw,8rem)] font-medium uppercase leading-[.86] tracking-[-.08em]">
          About<br /><span className="text-white/40">the label.</span>
        </h1>
        <p className="mt-10 max-w-2xl whitespace-pre-line text-base leading-8 text-white/65 sm:text-lg">
          {settings.about_text || "IMAGINATE is a UAE-based clothing and streetwear label."}
        </p>
        <Link href="/shop" className="group mt-10 inline-flex items-center gap-4 border-b border-white/45 pb-3 text-[10px] uppercase tracking-[.22em] transition-colors hover:border-[#c6b2f0] hover:text-[#c6b2f0]">
          Explore the collection <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Link>
      </div>
    </main>
  );
}