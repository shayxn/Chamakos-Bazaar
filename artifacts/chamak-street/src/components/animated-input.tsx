/**
 * AnimatedInput — each character fades in as the user types.
 *
 * Renders a real <input> (transparent text, visible caret) for all native
 * browser behaviour (cursor, selection, paste, autofill), then overlays an
 * absolutely-positioned div whose character <span>s animate on entry.
 *
 * Pass `wrapperClass` to forward font-size / text-color classes to the
 * container so the overlay inherits the same metrics as the hidden input.
 */
import { useState, useRef, useCallback, useEffect, forwardRef } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const EASE = [0.16, 1, 0.3, 1] as const;

type Char = { char: string; id: number };

export interface AnimatedInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onChange"> {
  value?: string;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  /** Classes forwarded to the outer wrapper div — use for text-size / color so the overlay matches the input. */
  wrapperClass?: string;
}

export const AnimatedInput = forwardRef<HTMLInputElement, AnimatedInputProps>(
  ({ value = "", onChange, className, wrapperClass, style, ...props }, ref) => {
    const counter = useRef(0);

    // Initialise char list from any pre-filled value (no animation on mount)
    const [chars, setChars] = useState<Char[]>(() =>
      (value ?? "").split("").map(char => ({ char, id: ++counter.current }))
    );
    const prevValue = useRef(value ?? "");

    // Sync if parent drives value externally (e.g. form reset)
    useEffect(() => {
      if ((value ?? "") !== prevValue.current) {
        prevValue.current = value ?? "";
        // External change — reinitialise without animation
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
            // Deletion — just trim
            return current.slice(0, next.length);
          }

          // Find first point of divergence (handles mid-word insertions too)
          let diffAt = 0;
          while (
            diffAt < prev.length &&
            diffAt < next.length &&
            prev[diffAt] === next[diffAt]
          ) {
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
      <div
        className={cn("relative", wrapperClass)}
        style={style}
      >
        {/* Real input — text is transparent so only the native caret is visible.
            All native UX (cursor, selection, paste, autofill) works normally. */}
        <input
          ref={ref}
          value={value}
          onChange={handleChange}
          className={cn(
            className,
            "!text-transparent caret-white",
            // Keep placeholder visible (::placeholder is unaffected by text-transparent)
          )}
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
