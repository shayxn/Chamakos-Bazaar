import { useState } from "react";
import { Loader2 } from "lucide-react";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "sending") return;
    if (!consent) { setState("error"); setMessage("Please agree to receive emails to subscribe."); return; }
    setState("sending"); setMessage("");
    try {
      const res = await fetch(`${BASE}/api/newsletter`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), consent: true }),
      });
      const data = await res.json().catch(() => ({})) as { error?: string; message?: string };
      if (!res.ok) throw new Error(data.error || "Could not subscribe. Please try again.");
      setState("done"); setMessage(data.message || "You are subscribed.");
      setEmail("");
    } catch (err) {
      setState("error"); setMessage(err instanceof Error ? err.message : "Could not subscribe. Please try again.");
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3" data-testid="form-newsletter" noValidate>
      <h4 className="font-black uppercase tracking-wider text-xs text-white/80">Newsletter</h4>
      {state === "done" ? (
        <p role="status" className="text-sm text-white/70" data-testid="text-newsletter-success">{message}</p>
      ) : (
        <>
          <div className="flex gap-2">
            <input
              type="email" required autoComplete="email" inputMode="email" value={email}
              onChange={e => setEmail(e.target.value)} placeholder="Email address" aria-label="Email address"
              data-testid="input-newsletter-email"
              className="h-10 min-w-0 flex-1 rounded-lg bg-white/5 px-3 text-sm text-white outline-none placeholder:text-white/30 border border-[rgba(124,58,237,0.3)] focus:border-[rgba(167,139,250,0.7)]"
            />
            <button type="submit" disabled={state === "sending" || !email.trim()} data-testid="button-newsletter-submit"
              className="h-10 rounded-lg bg-primary px-4 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50 flex items-center justify-center min-w-[84px]">
              {state === "sending" ? <Loader2 className="h-4 w-4 animate-spin" /> : "Subscribe"}
            </button>
          </div>
          <label className="flex items-start gap-2 text-[11px] leading-4 text-white/45 cursor-pointer">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)} data-testid="checkbox-newsletter-consent" className="mt-0.5 h-3.5 w-3.5 accent-[#7c3aed]" />
            I agree to receive marketing emails from IMAGINATE and can unsubscribe at any time.
          </label>
          {state === "error" && <p role="alert" className="text-xs font-bold text-destructive">{message}</p>}
        </>
      )}
    </form>
  );
}
