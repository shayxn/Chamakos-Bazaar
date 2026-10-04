import { PageTransition } from "@/components/page-transition";
import { Link } from "wouter";
import { useSettings } from "@/lib/use-settings";

export default function Privacy() {
  const settings = useSettings();
  const policy = settings.privacy_policy?.trim();

  return (
    <PageTransition>
      <main className="min-h-[70vh] bg-[#111113] px-6 py-20 text-[#f4f2f7] sm:px-10 sm:py-28">
        <div className="mx-auto max-w-3xl">
          <p className="mb-5 text-[10px] uppercase tracking-[.28em] text-[#bba4f4]">IMAGINATE</p>
          <h1 className="text-[clamp(2.8rem,8vw,5.8rem)] font-medium uppercase leading-[.9] tracking-[-.07em]">Privacy<br /><span className="text-white/40">policy.</span></h1>
          {policy ? (
            <p className="mt-10 whitespace-pre-line text-sm leading-7 text-white/65">{policy}</p>
          ) : (
            <p className="mt-10 max-w-xl text-sm leading-7 text-white/55">
              A privacy policy has not been published yet. Please contact Support with privacy questions.
              {" "}<Link href="/support" className="text-white underline underline-offset-4 hover:text-[#c6b2f0]">Go to Support</Link>
            </p>
          )}
        </div>
      </main>
    </PageTransition>
  );
}
