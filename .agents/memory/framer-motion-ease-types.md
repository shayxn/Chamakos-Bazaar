---
name: Framer-motion ease type fix
description: number[] not assignable to Easing in Variants objects — workaround pattern
---

## Rule
Never put `ease: [number, number, number, number]` directly in a `Variants` object. TypeScript's `Variants` type rejects `number[]` for `ease` even though framer-motion accepts it at runtime.

## How to apply
Use `const EASE_CURVE: any = [0.16, 1, 0.3, 1]` at module level and reference it everywhere.
For the `PageTransition` component, avoid `variants=` entirely — use direct `initial`/`animate`/`exit` props on `motion.div` instead.
For exported `revealItem`, type it as `any`: `export const revealItem: any = { ... }`.

**Why:** framer-motion's `Easing` union type does not include `number[]`, only specific bezier tuples — but TypeScript can't infer `[0.16, 1, 0.3, 1]` as a bezier tuple from an array literal without casting.
