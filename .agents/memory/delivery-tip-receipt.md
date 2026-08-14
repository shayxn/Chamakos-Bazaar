---
name: Delivery, Tip & Receipt system
description: Delivery method selector, tipping, and receipt page — DB schema, API, checkout, admin, account
---

## DB columns added to orders table
- `delivery_method TEXT DEFAULT 'standard'` — 'standard'|'express'|'priority'
- `delivery_charge NUMERIC(10,2) DEFAULT 20` — always stored server-side (not derived)
- `tip NUMERIC(10,2) DEFAULT 0` — customer optional tip

## Server-side logic (api-server/src/routes/orders.ts)
- `DELIVERY_CHARGES`: standard=20, express=30, priority=40
- API accepts `deliveryMethod` + `tip` in POST body; validates tip ≤ 500
- Total = itemsSubtotal + deliveryCharge + tip (no more flat SHIPPING_FEE=25)
- `serializeOrder()` converts deliveryCharge and tip to Number() for JSON

## Push notifications (lib/push.ts)
- `sendOrderPush` now accepts deliveryMethod, deliveryCharge, tip
- Body: `${name} · AED ${total} · ${deliveryLabel}${tipLine}`
- ⚡ Priority renders as "⚡ Priority" in notification body

## Checkout (pages/checkout.tsx)
- Uses raw fetch (not generated client) for POST /api/orders — avoids type conflicts
- Delivery selector: 3 glass cards (Standard/Express/Priority), Priority has ⚡ FASTEST badge
- Tip selector: No Tip / AED 5 / AED 10 / Custom (custom shows animated input)
- Order summary panel shows live delivery + tip lines with animated total
- Ziina flow also passes deliveryMethod + tip to /api/payments/ziina-checkout

## Order confirmation page (pages/order.tsx)
- Reads deliveryCharge, tip, deliveryMethod as `(order as any).xxx` casts
- Shows delivery label + emoji, tip line (yellow star), no more "free shipping" check

## Admin orders (pages/admin/orders.tsx)
- Order type has deliveryMethod, deliveryCharge, tip fields
- ⚡ Priority badge shown in order list header row
- 🚌 Express badge shown in order list header row
- Price Breakdown panel in expanded detail: items subtotal + delivery + tip + grand total
- "View Receipt" button opens /receipt/:id in new tab (alongside existing PNG canvas receipt)

## Account page (pages/account/index.tsx)
- My Orders list has "Track →" + "Receipt" buttons per order
- Receipt button links to /receipt/:id

## Receipt page (pages/receipt.tsx)
- Route: /receipt/:id — accessible to all (customers link from account, admin from orders)
- Uses useGetOrder hook (same as order.tsx — no admin gate on GET /orders/:id)
- Print-friendly HTML receipt: logo, customer info, items table, price breakdown, total
- window.print() for PDF/print — Print + Download PDF buttons
- Print CSS hides shell UI; @page sets A4 margins

**Why:** Delivery options replace the old flat-25 shipping fee. Tip is entirely optional, validated server-side. Receipt is HTML+print (no server-side PDF library needed).

**How to apply:** When changing order total calculation anywhere, always use itemsSubtotal + deliveryCharge + tip. Never hardcode SHIPPING_FEE=25 again.
