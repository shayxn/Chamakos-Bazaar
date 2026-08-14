---
name: FirstPick+ membership
description: Full membership system — backend routes, DB table, admin page, customer page, checkout integration, and order discounts.
---

## Architecture

**DB table** (created on first FP+ API request, not at boot): `firstpick_plus_memberships`
- status: 'pending' | 'active' | 'inactive'
- customer_id links to customer_accounts table (nullable for manually-added members)

**Site settings keys**: `fp_plus_price` (AED, default "30"), `fp_plus_launched` (default "false")

**API routes** (registered in routes/index.ts as `firstPickPlusRouter`):
- `GET  /firstpick-plus/settings` — public, returns price + launched
- `PUT  /firstpick-plus/settings` — admin, saves price/launched to site_settings
- `GET  /firstpick-plus/members` — admin, full member list
- `POST /firstpick-plus/members` — admin, manually add a member
- `POST /firstpick-plus/members/:id/activate` — admin
- `POST /firstpick-plus/members/:id/deactivate` — admin
- `DELETE /firstpick-plus/members/:id` — admin
- `GET  /firstpick-plus/my-status` — customer, returns { status, membership }

**Order discounts** (orders.ts): if session.customerId has active FP+ membership:
- Standard delivery → free (deliveryCharge = 0)
- AED 5 off (min 0, capped at itemsSubtotal)
- Wrapped in try/catch so FP+ check failure never blocks order creation

**Checkout client** (checkout.tsx): fetches /api/firstpick-plus/my-status on mount; shows "FREE" on standard delivery card + discount line in order summary if active.

**Customer page**: /firstpick-plus — benefits cards, price, Join WhatsApp button using whatsapp_number from /api/settings. Member status from /api/firstpick-plus/my-status.

**Admin page**: /admin/firstpick-plus — stats strip, settings panel (price + launch toggle), add member form, members table with activate/deactivate/delete.

**Nav links**: footer Support column in layout.tsx; Admin sidebar "Store" group in admin-layout.tsx (Crown icon).

**Why:** WhatsApp-first sales flow — customers inquire via WhatsApp, admin manually activates membership. No payment gateway needed.

**How to apply:** When extending FP+ (e.g. linking customer_id on WhatsApp inquiry), use the existing PATCH endpoint pattern. The `ensureTable()` call in every FP+ route handler creates the table idempotently — safe at any time.
