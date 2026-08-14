---
name: AnimatedInput component
description: Per-character fade-in input wrapper; drop-in for shadcn Input. Known patterns and gotchas.
---

## Location
`artifacts/chamak-street/src/components/animated-input.tsx`

## How it works
- Real `<input>` has `!text-transparent caret-white` so native cursor/selection/paste/autofill all work
- Absolutely-positioned overlay div shows framer-motion `<motion.span>` per character (fade + blur + scaleY)
- Wrapper div is `relative w-full`

## Base classes
The component now includes all shadcn Input base classes (rounded-xl, border, bg-white/[0.05], backdrop-blur-sm, px-3 py-1, etc.) in the INPUT_BASE constant. It is a true drop-in replacement for `<Input>` — no extra className required for basic use. Pass `className` to override specific properties (tailwind-merge handles conflicts correctly).

## wrapperClass
Use `wrapperClass` to put classes on the outer wrapper div. This is mainly for text size overrides on the overlay (which inherits from the wrapper). Example: the shop search uses `wrapperClass="text-xs text-white"` so the character overlay renders at text-xs.

## BASE URL pattern
Never use `@/lib/api-base` — that module does not exist. The correct pattern in any page:
```typescript
const BASE = import.meta.env.BASE_URL?.replace(/\/$/, "") || "";
```

**Why:** BASE_URL is injected by Vite at build time. The replace strips the trailing slash to avoid double-slashes in API calls.
