/**
 * AnimatedInput — each character fades in as the user types.
 *
 * Drop-in replacement for <Input>: includes all base shadcn Input classes
 * so it visually matches without needing extra className props.
 *
 * The real <input> has transparent text (native cursor/selection/paste/autofill
 * all work normally). An absolutely-positioned overlay renders the animated chars.
 *
 * Pass `wrapperClass` to forward extra classes to the outer wrapper div.
 */
import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

// Same base classes as shadcn/ui Input — keeps them in sync automatically
const INPUT_BASE =
  "flex w-full rounded-xl px-3 py-1 text-base md:text-sm " +
  "border border-white/[0.10] bg-white/[0.05] backdrop-blur-sm " +
  "shadow-[inset_0_1px_0_rgba(0,0,0,0.2),inset_0_-1px_0_rgba(255,255,255,0.03)] " +
  "placeholder:text-muted-foreground " +
  "transition-all duration-200 " +
  "focus-visible:outline-none focus-visible:border-primary/50 focus-visible:ring-1 focus-visible:ring-primary/30 focus-visible:bg-white/[0.08] " +
  "disabled:cursor-not-allowed disabled:opacity-50";

type Char = { char: string; id: number };

export interface AnimatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Extra classes on the outer wrapper div — use for width/color overrides. */
  wrapperClass?: string;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ value = "", onChange, className, wrapperClass, style, ...props }, ref) => {
    const counter = useRef(0);

    const [chars, setChars] = useState<Char[]>(() =>
      (value ?? "").split("").map(char => ({ char, id: ++counter.current }))
    );
    const prevValue = useRef(value ?? "");

    // Sync if parent drives value externally (e.g. form reset)
    useEffect(() => {
      if ((value ?? "") !== prevValue.current) {
        prevValue.current = value ?? "";
        counter.current = 0;
        setChars((value ?? "").split("").map(char => ({ char, id: ++counter.current })));
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [value]);

    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const next = e.target.value;
        const prev = prevValue.current;
        prevValue.current = next;

        setChars(current => {
          if (next.length === 0) return [];

          if (next.length < prev.length) {
            return current.slice(0, next.length);
          }

          // Find first point of divergence
          let diffAt = 0;
          while (diffAt < prev.length && diffAt < next.length && prev[diffAt] === next[diffAt]) {
            diffAt++;
          }

          const kept = current.slice(0, diffAt);
          const added = next.slice(diffAt).split("").map(char => ({
            char,
            id: ++counter.current,
          }));
          return [...kept, ...added];
        });

        onChange?.(e);
      },
      [onChange]
    );

    return (
      <div className={cn("relative w-full", wrapperClass)} style={style}>
        {/* Real input — text transparent, only caret visible.
            All native UX (cursor, selection, paste, autofill) works normally. */}
        <input
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(INPUT_BASE, className, "!text-transparent caret-white")}
          {...props}
        />

        {/* Animated character overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 flex items-center overflow-hidden select-none"
          style={{ paddingLeft: "0.75rem", paddingRight: "2rem" }}
        >
          {chars.map(({ char, id }) => (
            <motion.span
              key={id}
              initial={{ opacity: 0, y: 5, scaleY: 0.55, filter: "blur(3px)" }}
              animate={{ opacity: 1, y: 0, scaleY: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.22, ease: EASE }}
              style={{
                display: "inline-block",
                whiteSpace: "pre",
                fontFamily: "inherit",
                fontSize: "inherit",
                fontWeight: "inherit",
                letterSpacing: "inherit",
                lineHeight: "inherit",
              }}
            >
              {char}
            </motion.span>
          ))}
        </div>
      </div>
    );
  }
);
AnimatedInput.displayName = "AnimatedInput";
