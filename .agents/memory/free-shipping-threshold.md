---
name: Free shipping threshold
description: AED 300 threshold must be respected in both cart and checkout
---

## Rule
Free shipping unlocks when `subtotal >= 300`. Both cart and checkout must compute:
```ts
const shipping = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : SHIPPING_FEE;
const grandTotal = subtotal + shipping;
```

**Why:** Cart (cart.tsx) shows the progress bar and "Free 🎉" label correctly but originally checkout.tsx always added AED 25 regardless — inconsistent and bad UX.

## How to apply
- `artifacts/chamak-street/src/pages/cart.tsx` — `FREE_SHIPPING_THRESHOLD = 300`, uses `freeShippingGap` for progress bar
- `artifacts/chamak-street/src/pages/checkout.tsx` — same constant, shipping display toggles to green "Free 🎉"
