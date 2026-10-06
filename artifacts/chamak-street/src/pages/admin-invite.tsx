import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { motion } from "framer-motion";
import { CheckCircle2, Clock, Loader2, RefreshCw, ShieldAlert, WifiOff, Ban } from "lucide-react";
import { useInspectAdminInvitation, useAcceptAdminInvitation } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const TOKEN_RE = /^[A-Za-z0-9_-]{43}$/;

const schema = z.object({
  username: z
    .string()
    .min(3, "Username must be at least 3 characters.")
    .max(80, "Username must be 80 characters or fewer.")
    .regex(/^[A-Za-z0-9_.-]+$/, "Use only letters, numbers, dot, underscore or dash."),
  password: z.string().min(12, "Password must be at least 12 characters.").max(128, "Password must be 128 characters or fewer."),
});
type Values = z.infer<typeof schema>;

type Phase =
  | { kind: "missing" }
  | { kind: "loading" }
  | { kind: "ready"; permissions: string[]; expiresAt: string }
  | { kind: "expired" | "revoked" | "used" | "invalid" }
  | { kind: "network" }
  | { kind: "done"; username: string };

function readToken() {
  return window.location.hash.replace(/^#/, "").trim();
}

function classify(err: unknown): Phase {
  const e = err as { status?: number; data?: unknown; message?: string } | null;
  if (!e || typeof e.status !== "number") return { kind: "network" };
  if (e.status >= 500 || e.status === 429 || e.status === 408) return { kind: "network" };
  const d = e.data as { error?: string; message?: string } | null;
  const text = `${d?.error ?? ""} ${d?.message ?? ""} ${e.message ?? ""}`.toLowerCase();
  if (text.includes("revoke")) return { kind: "revoked" };
  if (text.includes("expire")) return { kind: "expired" };
  if (/accept|used|already/.test(text)) return { kind: "used" };
  return { kind: "invalid" };
}

function errText(err: unknown) {
  const d = (err as { data?: { error?: string; message?: string } })?.data;
  return d?.error ?? d?.message ?? "";
}

const LABELS: Record<string, string> = {
  products: "Products",
  orders: "Orders",
  content: "Content",
  support: "Support",
  customers: "Customers",
  discounts: "Discounts",
  analytics: "Analytics",
  notifications: "Notifications",
  settings: "Settings",
};

const BLOCKED: Record<string, { title: string; body: string; icon: typeof Clock }> = {
  expired: { title: "This invitation has expired", body: "Ask the person who invited you to send a fresh link.", icon: Clock },
  revoked: { title: "This invitation was revoked", body: "It is no longer valid. Contact the person who invited you.", icon: Ban },
  used: { title: "This invitation was already used", body: "If that was you, sign in with the account you created.", icon: ShieldAlert },
  invalid: { title: "This invitation link is not valid", body: "Check that you copied the whole link, or ask for a new one.", icon: ShieldAlert },
  missing: { title: "No invitation found in this link", body: "Open the full invitation link you were sent.", icon: ShieldAlert },
};

export default function AdminInvite() {
  const [token, setToken] = useState(readToken);
  const [phase, setPhase] = useState<Phase>({ kind: "loading" });
  const [submitError, setSubmitError] = useState("");
  const tokenRef = useRef(token);
  tokenRef.current = token;
  const doneRef = useRef(false);
  const lastInspected = useRef<string | null>(null);

  const inspect = useInspectAdminInvitation();
  const accept = useAcceptAdminInvitation();
  const inspectMutate = useRef(inspect.mutate);
  inspectMutate.current = inspect.mutate;
  const acceptMutate = useRef(accept.mutate);
  acceptMutate.current = accept.mutate;

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: { username: "", password: "" },
  });

  useEffect(() => {
    const onHash = () => {
      if (doneRef.current) return;
      setToken(readToken());
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const runInspect = useCallback((t: string) => {
    lastInspected.current = t;
    setSubmitError("");
    if (!TOKEN_RE.test(t)) {
      setPhase({ kind: t ? "invalid" : "missing" });
      return;
    }
    setPhase({ kind: "loading" });
    inspectMutate.current(
      { data: { token: t } },
      {
        onSuccess: (res) => {
          if (tokenRef.current !== t) return;
          setPhase({ kind: "ready", permissions: res.permissions, expiresAt: res.expiresAt });
        },
        onError: (err) => {
          if (tokenRef.current !== t) return;
          setPhase(classify(err));
        },
      },
    );
  }, []);

  useEffect(() => {
    if (doneRef.current || lastInspected.current === token) return;
    form.reset({ username: "", password: "" });
    runInspect(token);
  }, [token, runInspect, form]);

  const onSubmit = (v: Values) => {
    const t = tokenRef.current;
    setSubmitError("");
    acceptMutate.current(
      { data: { token: t, username: v.username, password: v.password } },
      {
        onSuccess: (member) => {
          doneRef.current = true;
          form.reset({ username: "", password: "" });
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
          setPhase({ kind: "done", username: member.username });
        },
        onError: (err) => {
          const next = classify(err);
          const status = (err as { status?: number })?.status;
          if (next.kind === "network") {
            setSubmitError("We could not reach the server. Check your connection and try again.");
          } else if (status === 409) {
            setSubmitError(errText(err) || "That username is taken. Choose another.");
          } else if (["expired", "revoked", "used"].includes(next.kind)) {
            setPhase(next);
          } else {
            setSubmitError(errText(err) || "We could not create your account. Check the details and try again.");
          }
        },
      },
    );
  };

  const blocked = BLOCKED[phase.kind];
  const pending = accept.isPending;

  return (
    <div className="relative min-h-[100dvh] flex items-center justify-center overflow-hidden bg-[#050507] px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 15%, rgba(183,156,255,0.18), transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(183,156,255,0.08), transparent 60%)" }}
      />
      <motion.main
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="glass-modal relative z-10 w-full max-w-md rounded-3xl p-6 sm:p-9"
        data-testid="page-admin-invite"
      >
        <div className="flex justify-center">
          <img src="/imaginate-logo.png" alt="IMAGINATE" className="h-16 w-48 object-contain" data-testid="img-logo" />
        </div>

        <div className="mt-7 text-center">
          <h1 className="text-2xl sm:text-[1.7rem] font-black leading-tight tracking-tight text-white" data-testid="text-invite-heading">
            You're invited to join the Imaginate admins.
          </h1>
          <p className="mt-2 text-base font-semibold text-primary" data-testid="text-invite-cta">
            Press this link to join!
          </p>
        </div>

        <div className="mt-8" aria-live="polite">
          {phase.kind === "loading" && (
            <div className="space-y-3" data-testid="state-loading" aria-label="Checking your invitation">
              <div className="glass-skeleton h-4 w-2/3 rounded" />
              <div className="glass-skeleton h-12 w-full rounded-xl" />
              <div className="glass-skeleton h-12 w-full rounded-xl" />
              <p className="pt-1 text-center text-xs text-muted-foreground">Checking your invitation...</p>
            </div>
          )}

          {blocked && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center" data-testid={`state-${phase.kind}`}>
              <blocked.icon className="mx-auto h-7 w-7 text-primary" />
              <h2 className="mt-3 text-base font-bold text-white" data-testid="text-state-title">{blocked.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{blocked.body}</p>
              {phase.kind === "used" && (
                <Button asChild className="mt-4 w-full" data-testid="link-login-used">
                  <Link href="/login">Go to sign in</Link>
                </Button>
              )}
            </div>
          )}

          {phase.kind === "network" && (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center" data-testid="state-network-error">
              <WifiOff className="mx-auto h-7 w-7 text-primary" />
              <h2 className="mt-3 text-base font-bold text-white">We could not reach the server</h2>
              <p className="mt-1 text-sm text-muted-foreground">Your invitation has not been checked yet. Try again.</p>
              <Button onClick={() => runInspect(token)} className="mt-4 w-full gap-2" data-testid="button-retry-inspect">
                <RefreshCw className="h-4 w-4" /> Try again
              </Button>
            </div>
          )}

          {phase.kind === "ready" && (
            <div data-testid="state-ready">
              <div className="rounded-2xl border border-primary/25 bg-primary/10 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">Access selected for you</p>
                {phase.permissions.length ? (
                  <ul className="mt-2 flex flex-wrap gap-2" data-testid="list-permissions">
                    {phase.permissions.map((p) => (
                      <li key={p} className="glass-pill px-3 py-1 text-xs font-semibold text-white" data-testid={`permission-${p}`}>
                        {LABELS[p] ?? p}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground" data-testid="text-no-permissions">No specific areas were selected.</p>
                )}
                <p className="mt-3 text-xs text-muted-foreground" data-testid="text-expires">
                  Link valid until {new Date(phase.expiresAt).toLocaleString()}
                </p>
              </div>

              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="mt-5 space-y-4" noValidate>
                  <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Username</FormLabel>
                        <FormControl>
                          <Input {...field} autoComplete="username" disabled={pending} className="h-12 glass-input" data-testid="input-username" />
                        </FormControl>
                        <FormMessage data-testid="error-username" />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Password</FormLabel>
                        <FormControl>
                          <Input {...field} type="password" autoComplete="new-password" disabled={pending} className="h-12 glass-input" data-testid="input-password" />
                        </FormControl>
                        <FormMessage data-testid="error-password" />
                      </FormItem>
                    )}
                  />
                  {submitError && (
                    <p role="alert" className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-red-200" data-testid="error-submit">
                      {submitError}
                    </p>
                  )}
                  <Button
                    type="submit"
                    disabled={pending}
                    className="h-12 w-full border-none font-black uppercase tracking-widest fire-gradient text-white"
                    data-testid="button-accept-invite"
                  >
                    {pending ? (
                      <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Creating account</span>
                    ) : (
                      "Join the admins"
                    )}
                  </Button>
                </form>
              </Form>
            </div>
          )}

          {phase.kind === "done" && (
            <div className="rounded-2xl border border-primary/25 bg-primary/10 p-6 text-center" data-testid="state-success">
              <CheckCircle2 className="mx-auto h-9 w-9 text-primary" />
              <h2 className="mt-3 text-lg font-bold text-white">Welcome to the team</h2>
              <p className="mt-1 text-sm text-muted-foreground" data-testid="text-created-username">
                Your account <span className="font-semibold text-white">{phase.username}</span> is ready. Sign in to continue.
              </p>
              <Button asChild className="mt-5 h-12 w-full border-none font-black uppercase tracking-widest fire-gradient text-white" data-testid="link-login">
                <Link href="/login">Go to sign in</Link>
              </Button>
            </div>
          )}
        </div>
      </motion.main>
    </div>
  );
}
