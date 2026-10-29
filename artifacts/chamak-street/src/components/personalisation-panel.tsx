/* @refresh reset */
import { useId, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { formatPrice } from "@/lib/currency";
import { PERSONALIZATION_OPTION_FEE } from "@/components/personalization-line";

const EASE = [0.16, 1, 0.3, 1] as const;

// eslint-disable-next-line no-control-regex
const CONTROL_CHARS = /[\u0000-\u001F\u007F-\u009F]/;
export function validatePersonalName(v: string): string | null {
  const t = v.trim();
  if (!t) return "Enter a name (1–30 characters).";
  if (t.length > 30) return `Name is ${t.length} characters — max 30.`;
  if (CONTROL_CHARS.test(t)) return "Name contains unsupported characters.";
  return null;
}
export function validatePersonalNumber(v: string): string | null {
  if (!v) return "Enter a number (1–3 digits).";
  if (!/^[0-9]{1,3}$/.test(v)) return "Use 1–3 digits only (0–9).";
  return null;
}

export function PersonalisationPanel(props: {
  label: string; choice: "no" | "yes"; setChoice: (c: "no" | "yes") => void;
  wantName: boolean; setWantName: (b: boolean) => void; wantNumber: boolean; setWantNumber: (b: boolean) => void;
  nameVal: string; setNameVal: (s: string) => void; numberVal: string; setNumberVal: (s: string) => void;
  nameError: string | null; numberError: string | null; noneSelected: boolean; showErrors: boolean;
}) {
  const { label, choice, setChoice, wantName, setWantName, wantNumber, setWantNumber, nameVal, setNameVal, numberVal, setNumberVal, nameError, numberError, noneSelected, showErrors } = props;
  const uid = useId();
  const pill = (active: boolean) => `h-10 px-5 rounded-lg border text-sm font-black uppercase tracking-wider transition-colors ${active ? "size-swatch-selected" : "border-white/15 bg-white/5 text-white/70 hover:border-primary/40"}`;
  const optRow = (checked: boolean) => `flex items-center gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors ${checked ? "border-primary/60 bg-primary/10" : "border-white/12 bg-white/[0.03] hover:border-primary/30"}`;
  return (
    <fieldset className="rounded-xl border border-white/10 bg-white/[0.03] p-4" data-testid="panel-personalisation">
      <legend className="sr-only">Personalisation</legend>
      <p className="font-black uppercase tracking-wider text-sm mb-3" id={`personalise-q-${uid}`}>Would you like to personalise your {label}?</p>
      <div className="flex gap-2" role="radiogroup" aria-labelledby={`personalise-q-${uid}`}>
        <button type="button" role="radio" aria-checked={choice === "no"} onClick={() => setChoice("no")} className={pill(choice === "no")} data-testid="button-personalise-no">No</button>
        <button type="button" role="radio" aria-checked={choice === "yes"} onClick={() => setChoice("yes")} className={pill(choice === "yes")} data-testid="button-personalise-yes">Yes</button>
      </div>
      <AnimatePresence initial={false}>
        {choice === "yes" && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.18, ease: EASE }} className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">Pick one or both. Each option adds {formatPrice(PERSONALIZATION_OPTION_FEE)} per item.</p>
            <div>
              <label className={optRow(wantName)}>
                <input type="checkbox" checked={wantName} onChange={(e) => setWantName(e.target.checked)} className="h-4 w-4 accent-[#b79cff]" data-testid="checkbox-personalise-name" />
                <span className="flex-1 text-sm font-bold">Name</span>
                <span className="text-xs font-mono text-primary">+{formatPrice(PERSONALIZATION_OPTION_FEE)}</span>
              </label>
              {wantName && (
                <div className="mt-2">
                  <input value={nameVal} onChange={(e) => setNameVal(e.target.value)} maxLength={40} placeholder="e.g. RAYAN" aria-label="Personalisation name"
                    aria-invalid={showErrors && !!nameError} aria-describedby={`personal-name-help-${uid}`}
                    className={`w-full glass-input rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none ${showErrors && nameError ? "border-destructive/70" : ""}`} data-testid="input-personalise-name" />
                  <p id={`personal-name-help-${uid}`} className={`mt-1 text-[11px] ${showErrors && nameError ? "text-destructive font-bold" : "text-muted-foreground"}`} data-testid="text-personalise-name-error">
                    {showErrors && nameError ? nameError : `${nameVal.trim().length}/30 characters`}
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className={optRow(wantNumber)}>
                <input type="checkbox" checked={wantNumber} onChange={(e) => setWantNumber(e.target.checked)} className="h-4 w-4 accent-[#b79cff]" data-testid="checkbox-personalise-number" />
                <span className="flex-1 text-sm font-bold">Number</span>
                <span className="text-xs font-mono text-primary">+{formatPrice(PERSONALIZATION_OPTION_FEE)}</span>
              </label>
              {wantNumber && (
                <div className="mt-2">
                  <input type="text" inputMode="numeric" pattern="[0-9]*" value={numberVal} onChange={(e) => setNumberVal(e.target.value)} maxLength={3} placeholder="e.g. 07" aria-label="Personalisation number"
                    aria-invalid={showErrors && !!numberError} aria-describedby={`personal-number-help-${uid}`}
                    className={`w-32 glass-input rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none ${showErrors && numberError ? "border-destructive/70" : ""}`} data-testid="input-personalise-number" />
                  <p id={`personal-number-help-${uid}`} className={`mt-1 text-[11px] ${showErrors && numberError ? "text-destructive font-bold" : "text-muted-foreground"}`} data-testid="text-personalise-number-error">
                    {showErrors && numberError ? numberError : "1–3 digits. Leading zeros are kept (07 stays 07)."}
                  </p>
                </div>
              )}
            </div>
            {noneSelected && <p className="text-[11px] font-bold text-destructive" role="alert" data-testid="text-personalise-none">Select Name, Number, or both — or choose No.</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </fieldset>
  );
}

/** Self-contained personalisation state; resets whenever resetKey changes. */
export function usePersonalisation(resetKey: unknown) {
  const [choice, setChoice] = useState<"no" | "yes">("no");
  const [wantName, setWantName] = useState(false);
  const [wantNumber, setWantNumber] = useState(false);
  const [nameVal, setNameVal] = useState("");
  const [numberVal, setNumberVal] = useState("");
  const [touched, setTouched] = useState(false);
  useEffect(() => {
    setChoice("no"); setWantName(false); setWantNumber(false);
    setNameVal(""); setNumberVal(""); setTouched(false);
  }, [resetKey]);
  const yes = choice === "yes";
  const nameError = yes && wantName ? validatePersonalName(nameVal) : null;
  const numberError = yes && wantNumber ? validatePersonalNumber(numberVal) : null;
  const noneSelected = yes && !wantName && !wantNumber;
  const invalid = noneSelected || !!nameError || !!numberError;
  const fee = yes ? ((wantName ? 1 : 0) + (wantNumber ? 1 : 0)) * PERSONALIZATION_OPTION_FEE : 0;
  const payload = yes
    ? { personalizationName: wantName ? nameVal.trim() : undefined, personalizationNumber: wantNumber ? numberVal : undefined }
    : {};
  const errorMessage = noneSelected ? "Select Name and/or Number, or choose No." : (nameError || numberError || "");
  const panelProps = {
    choice, setChoice, wantName, setWantName, wantNumber, setWantNumber, nameVal, setNameVal, numberVal, setNumberVal,
    nameError, numberError, noneSelected, showErrors: touched || nameVal.length > 0 || numberVal.length > 0,
  };
  return { invalid, fee, payload, errorMessage, setTouched, panelProps };
}
