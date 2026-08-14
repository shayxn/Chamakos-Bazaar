---
name: Cart items null guard
description: cart?.items is unsafe — the optional chain stops at cart but not at items; use (cart?.items ?? []) everywhere.
---

# Cart Items Null Guard

## Rule
Never write `cart?.items.method(...)`. The optional chain `cart?.` guards against null/undefined cart, but if the cart API response returns `{ total: 0 }` without `items`, or returns during a loading state, `cart.items` is undefined and calling any array method crashes.

**Why:** This caused a full React app crash (`Cannot read properties of undefined (reading 'reduce')`) in both `layout.tsx` and `mobile-layout.tsx`, taking down the entire site.

**How to apply:** Always use `(cart?.items ?? []).reduce/map/find/filter(...)` — the nullish coalescing fallback to `[]` ensures the array method always has an array to operate on.

Same pattern applies to any API response that returns an object with an optional array field.
