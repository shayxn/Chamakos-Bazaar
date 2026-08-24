import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link, useLocation } from "wouter";
import { Mail, ArrowLeft, RefreshCw, X } from "lucide-react";
import { useAccount } from "./index";

const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";

type Step = "form" | "verify";

interface VerifyResponse {
  ok?: boolean;
  emailSent?: boolean;
  devCode?: string;
  error?: string;
  attemptsLeft?: number;
  locked?: boolean;
  lockedUntil?: number;
  expired?: boolean;
}

export default function AccountRegister() {
  const [step, setStep] = useState<Step>("form");
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [digits, setDigits] = useState(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [attemptsLeft, setAttemptsLeft] = useState<number | null>(null);
  const [lockedUntil, setLockedUntil] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [devCode, setDevCode] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(true);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [, navigate] = useLocation();
  const { reload } = useAccount();

  /* ── Lockout countdown ────────────────────────────────────────────── */
  useEffect(() => {
    if (!lockedUntil) return;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((lockedUntil - Date.now()) / 1000));
      setTimeLeft(left);
      if (left === 0) { setLockedUntil(null); setError(""); }
    }, 500);
    return () => clearInterval(tick);
  }, [lockedUntil]);

  const code = digits.join("");
  const isLocked = !!lockedUntil && lockedUntil > Date.now();

  /* ── OTP input handlers ───────────────────────────────────────────── */
  const handleDigit = (idx: number, val: string) => {
    const d = val.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[idx] = d;
    setDigits(next);
    setError("");
    if (d && idx < 5) setTimeout(() => inputRefs.current[idx + 1]?.focus(), 0);
  };
  const handleKeyDown = (idx: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      if (!digits[idx] && idx > 0) {
        const next = [...digits];
        next[idx - 1] = "";
        setDigits(next);
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) inputRefs.current[idx - 1]?.focus();
    else if (e.key === "ArrowRight" && idx < 5) inputRefs.current[idx + 1]?.focus();
  };
  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (pasted.length > 0) {
      setDigits([...pasted.padEnd(6, "").slice(0, 6).split("")]);
      const focusIdx = Math.min(pasted.length, 5);
      setTimeout(() => inputRefs.current[focusIdx]?.focus(), 0);
    }
    e.preventDefault();
  };

  /* ── Send verification code ───────────────────────────────────────── */
  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (form.password.length < 6) { setError("Password must be at least 6 characters"); return; }
    setLoading(true); setError(""); setDevCode(null);
    try {
      const res = await fetch(`${BASE}/api/customers/send-verification`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data: VerifyResponse = await res.json();
      if (!res.ok) { setError(data.error ?? "Failed to send code"); return; }
      setEmailSent(data.emailSent ?? true);
      if (data.devCode) setDevCode(data.devCode);
      setDigits(["", "", "", "", "", ""]);
      setAttemptsLeft(null);
      setLockedUntil(null);
      setStep("verify");
      setTimeout(() => inputRefs.current[0]?.focus(), 200);
    } finally { setLoading(false); }
  };

  /* ── Verify code ──────────────────────────────────────────────────── */
  const verifyCode = async () => {
    if (code.length < 6) { setError("Please enter the full 6-digit code"); return; }
    setLoading(true); setError("");
    try {
      const res = await fetch(`${BASE}/api/customers/verify-registration`, {
        method: "POST", credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: form.email, code }),
      });
      const data: VerifyResponse = await res.json();
      if (res.ok) {
        reload();
        navigate("/account");
        return;
      }
      setError(data.error ?? "Verification failed");
      if (data.attemptsLeft !== undefined) setAttemptsLeft(data.attemptsLeft);
      if (data.locked && data.lockedUntil) {
        setLockedUntil(data.lockedUntil);
        setTimeLeft(Math.ceil((data.lockedUntil - Date.now()) / 1000));
      }
      if (data.expired) setStep("form");
      // Clear digits on wrong code
      if (!data.expired) {
        setDigits(["", "", "", "", "", ""]);
        setTimeout(() => inputRefs.current[0]?.focus(), 0);
      }
    } finally { setLoading(false); }
  };

  const SPRING = { type: "spring" as const, stiffness: 280, damping: 26 };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm relative">
        <AnimatePresence mode="wait">

          {/* ── STEP: form ──────────────────────────────────────────── */}
          {step === "form" && (
            <motion.div key="form" initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={SPRING}>
              {/* Logo */}
              <div className="flex justify-center mb-6">
                <div className="px-5 py-3 rounded-2xl border border-primary/20" style={{ background: "rgba(255,102,0,0.07)" }}>
                  <span className="font-black text-2xl tracking-tight">
                    <span className="text-white">FIRST</span>
                    <span className="text-primary">PICK</span>
                  </span>
                </div>
              </div>

              <h1 className="text-3xl font-black uppercase tracking-tight mb-1 text-center">Create Account</h1>
              <p className="text-muted-foreground text-sm text-center mb-8">Join FirstPick for faster checkout &amp; order tracking</p>

              <form onSubmit={sendCode} className="space-y-4">
                {error && (
                  <div className="px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive font-bold">{error}</div>
                )}
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="John Doe" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="you@example.com" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Phone (optional)</label>
                  <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="+971 50 000 0000" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest text-muted-foreground">Password *</label>
                  <input required type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                    className="w-full px-4 py-3 bg-card border border-border rounded-xl text-sm focus:outline-none focus:border-primary/60 transition-colors" placeholder="Min. 6 characters" />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full py-4 font-black uppercase tracking-widest text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
                  {loading ? "Sending code…" : "Send Verification Code →"}
                </button>
              </form>

              <p className="text-center text-sm text-muted-foreground mt-6">
                Already have an account?{" "}
                <Link href="/account/login" className="text-primary font-bold hover:underline">Sign in →</Link>
              </p>
            </motion.div>
          )}

          {/* ── STEP: verify ────────────────────────────────────────── */}
          {step === "verify" && (
            <motion.div key="verify" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={SPRING}
              className="text-center">

              {/* Header row */}
              <div className="flex items-center justify-between mb-8">
                <button onClick={() => { setStep("form"); setError(""); setDigits(["","","","","",""]); }}
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:border-white/25 transition-colors text-muted-foreground hover:text-white">
                  <ArrowLeft size={16} />
                </button>
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
                  <Mail size={22} className="text-primary" />
                </div>
                <Link href="/account/login"
                  className="w-9 h-9 flex items-center justify-center rounded-xl border border-white/10 hover:border-white/25 transition-colors text-muted-foreground hover:text-white">
                  <X size={16} />
                </Link>
              </div>

              <h2 className="font-black text-2xl mb-2">Check your email</h2>
              <p className="text-muted-foreground text-sm mb-1">
                {emailSent
                  ? <>We sent a 6-digit code to</>
                  : <>Email service not set up. Please contact support for</>}
              </p>
              <p className="font-bold text-sm mb-8">{form.email}</p>

              {/* Dev mode: show code when SMTP not configured */}
              {devCode && (
                <div className="mb-6 px-4 py-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-xs text-yellow-400 font-mono">
                  DEV MODE — Code: <span className="font-black text-base tracking-widest">{devCode}</span>
                </div>
              )}

              {/* 6-digit boxes */}
              <div className="flex gap-2 justify-center mb-6" onPaste={handlePaste}>
                {digits.map((d, i) => (
                  <input
                    key={i}
                    ref={el => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={d}
                    onChange={e => handleDigit(i, e.target.value)}
                    onKeyDown={e => handleKeyDown(i, e)}
                    disabled={isLocked || loading}
                    className={[
                      "w-11 h-14 text-center text-xl font-black rounded-xl border transition-all focus:outline-none",
                      d ? "border-primary/60 bg-primary/8 text-white" : "border-white/12 bg-white/4 text-muted-foreground",
                      isLocked ? "opacity-40" : "focus:border-primary/60",
                    ].join(" ")}
                    style={{ background: d ? "rgba(255,102,0,0.07)" : "rgba(255,255,255,0.03)" }}
                  />
                ))}
              </div>

              {/* Error / lockout / attempts */}
              {isLocked ? (
                <div className="mb-5 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm">
                  <p className="text-destructive font-bold">Too many attempts</p>
                  <p className="text-muted-foreground text-xs mt-1">
                    Try again in{" "}
                    <span className="font-black text-white">
                      {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, "0")}
                    </span>
                  </p>
                </div>
              ) : error ? (
                <div className="mb-5 px-4 py-3 bg-destructive/10 border border-destructive/20 rounded-xl text-sm text-destructive font-bold">
                  {error}
                  {attemptsLeft !== null && attemptsLeft > 0 && (
                    <span className="block text-xs font-normal text-muted-foreground mt-0.5">{attemptsLeft} attempt{attemptsLeft !== 1 ? "s" : ""} remaining</span>
                  )}
                </div>
              ) : null}

              <button
                onClick={verifyCode}
                disabled={loading || isLocked || code.length < 6}
                className="w-full py-4 font-black uppercase tracking-widest text-sm rounded-xl bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-40 mb-4"
              >
                {loading ? "Verifying…" : "Verify →"}
              </button>

              {/* Resend */}
              <button onClick={() => sendCode()} disabled={loading || isLocked}
                className="text-sm text-muted-foreground hover:text-primary disabled:opacity-40 transition-colors flex items-center gap-1.5 mx-auto">
                <RefreshCw size={13} />
                Resend code
              </button>

              <p className="text-xs text-muted-foreground/40 mt-6">Code expires in 10 minutes</p>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
